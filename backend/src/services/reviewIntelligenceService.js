
const { safeInsert, safeUpsert } = require('./safeDbService')

function clamp(n,min=-100,max=100){ return Math.max(min, Math.min(max, Number(n)||0)) }

function normalizeText(value) {
  return String(value || '').toLowerCase()
}

function unique(arr) {
  return [...new Set(arr)]
}

class ReviewIntelligenceService {
  constructor(supabase) {
    this.supabase = supabase
  }

  async dictionary() {
    const { data, error } = await this.supabase.from('review_topic_dictionary').select('*').eq('active', true)
    if (error) return []
    return data || []
  }

  async templates(customer_id=null) {
    let q = this.supabase.from('review_response_templates').select('*').eq('active', true)
    if (customer_id) q = q.or(`customer_id.is.null,customer_id.eq.${customer_id}`)
    const { data, error } = await q
    if (error) return []
    return data || []
  }

  detectSentiment({ rating, text, topics }) {
    let score = 0
    const r = Number(rating || 0)
    if (r >= 5) score += 70
    else if (r === 4) score += 40
    else if (r === 3) score += 0
    else if (r === 2) score -= 45
    else if (r === 1) score -= 75

    const t = normalizeText(text)
    const positiveWords = ['super','perfekt','freundlich','lecker','toll','empfehlen','zufrieden','top','schnell','gut']
    const negativeWords = ['schlecht','unfreundlich','lange','teuer','dreckig','nie wieder','enttäuscht','kalt','mangelhaft']
    for (const w of positiveWords) if (t.includes(w)) score += 8
    for (const w of negativeWords) if (t.includes(w)) score -= 10

    for (const topic of topics || []) {
      if (topic.topic_type === 'positive') score += Number(topic.severity_weight || 1) * 5
      if (topic.topic_type === 'negative') score -= Number(topic.severity_weight || 1) * 7
    }

    score = clamp(score)
    const sentiment = score >= 25 ? 'positive' : score <= -25 ? 'negative' : 'neutral'
    return { sentiment, score }
  }

  detectTopics(text, dictionary) {
    const t = normalizeText(text)
    const detected = []
    for (const topic of dictionary) {
      const keywords = topic.keywords || []
      if (keywords.some(k => t.includes(normalizeText(k)))) {
        detected.push({
          topic_key: topic.topic_key,
          label: topic.label,
          topic_type: topic.topic_type,
          severity_weight: topic.severity_weight
        })
      }
    }
    return detected
  }

  createSummary({ rating, text, sentiment, topics }) {
    const labels = (topics || []).map(t => t.label).join(', ')
    const base = sentiment === 'positive'
      ? 'Positive Bewertung'
      : sentiment === 'negative'
        ? 'Kritische Bewertung'
        : 'Neutrale Bewertung'
    return `${base} mit ${rating || 'ohne'} Sternen${labels ? ` zu: ${labels}` : ''}.`
  }

  async suggestedResponse({ customer_id, sentiment, topics }) {
    const templates = await this.templates(customer_id)
    const direct = templates.find(t => t.sentiment === sentiment)
    if (direct) return direct.body

    if (sentiment === 'positive') return 'Vielen Dank für das positive Feedback! Wir freuen uns sehr darüber.'
    if (sentiment === 'negative') return 'Vielen Dank für Ihre ehrliche Rückmeldung. Wir prüfen das intern und möchten uns verbessern.'
    return 'Vielen Dank für Ihre Rückmeldung.'
  }

  async analyzeReview(review) {
    const dictionary = await this.dictionary()
    const text = review.feedback_text || review.message || review.comment || review.text || ''
    const rating = Number(review.rating || 0)
    const topics = this.detectTopics(text, dictionary)
    const sentiment = this.detectSentiment({ rating, text, topics })

    const issueTags = topics.filter(t => t.topic_type === 'negative')
    const praiseTags = topics.filter(t => t.topic_type === 'positive')
    const escalation = sentiment.sentiment === 'negative' || rating <= 3 || issueTags.some(t => Number(t.severity_weight || 0) >= 4)
    const summary = this.createSummary({ rating, text, sentiment: sentiment.sentiment, topics })
    const suggested = await this.suggestedResponse({ customer_id: review.customer_id, sentiment: sentiment.sentiment, topics })

    const itemPayload = {
      customer_id: review.customer_id,
      review_feedback_id: review.id || null,
      rating,
      sentiment: sentiment.sentiment,
      sentiment_score: sentiment.score,
      detected_topics: topics,
      issue_tags: issueTags,
      praise_tags: praiseTags,
      summary,
      suggested_response: suggested,
      escalation_required: escalation,
      metadata: { original_review: review }
    }

    const item = await safeInsert(this.supabase, 'review_intelligence_items', itemPayload)

    if (review.id) {
      await this.supabase.from('review_feedback').update({
        intelligence_status: 'analyzed',
        sentiment: sentiment.sentiment,
        detected_topics: topics,
        suggested_response: suggested
      }).eq('id', review.id)
    }

    if (escalation) {
      await safeInsert(this.supabase, 'customer_timeline_events', {
        customer_id: review.customer_id,
        event_type: 'review_intelligence_escalation',
        title: 'Kritische Bewertung erkannt',
        description: summary,
        source_module: 'review_intelligence',
        source_id: item?.id || review.id || null,
        severity: 'warning',
        actor_name: 'Review Intelligence',
        metadata: itemPayload
      })

      await safeInsert(this.supabase, 'ai_business_assistant_messages', {
        customer_id: review.customer_id,
        title: 'Kritische Review-Auswertung',
        message: `${summary} Empfohlene Antwort: ${suggested}`,
        recommendation_type: 'review_intelligence',
        severity: 'warning',
        source_modules: ['reviews','review_intelligence','customer_health'],
        related_entity_type: 'review_feedback',
        related_entity_id: review.id || null,
        metadata: itemPayload
      })

      await safeInsert(this.supabase, 'tickets', {
        customer_id: review.customer_id,
        title: 'Kritische Bewertung prüfen',
        description: `${summary}\n\nAntwortvorschlag:\n${suggested}`,
        status: 'open',
        priority: 'high',
        source: 'review_intelligence'
      })
    }

    return item || itemPayload
  }

  async analyzeCustomer(customer_id) {
    const { data:reviews, error } = await this.supabase.from('review_feedback').select('*').eq('customer_id', customer_id)
    if (error) throw error

    const analyzed = []
    for (const review of (reviews || [])) {
      if (review.intelligence_status !== 'analyzed') {
        analyzed.push(await this.analyzeReview(review))
      }
    }

    return this.rebuildProfile(customer_id)
  }

  countTopics(items, field) {
    const map = {}
    for (const item of items) {
      for (const topic of (item[field] || [])) {
        const key = topic.topic_key || topic.label
        if (!map[key]) map[key] = { ...topic, count:0 }
        map[key].count += 1
      }
    }
    return Object.values(map).sort((a,b)=>b.count-a.count)
  }

  async rebuildProfile(customer_id) {
    const { data:items, error } = await this.supabase.from('review_intelligence_items').select('*').eq('customer_id', customer_id)
    if (error) throw error

    const total = (items || []).length
    const ratings = (items || []).map(i=>Number(i.rating||0)).filter(Boolean)
    const avg = ratings.length ? ratings.reduce((a,b)=>a+b,0)/ratings.length : 0
    const positive = (items || []).filter(i=>i.sentiment === 'positive').length
    const negative = (items || []).filter(i=>i.sentiment === 'negative').length
    const neutral = total - positive - negative
    const score = total ? Math.round((positive / total) * 100 - (negative / total) * 100) : 0
    const topPositive = this.countTopics(items || [], 'praise_tags').slice(0, 8)
    const topNegative = this.countTopics(items || [], 'issue_tags').slice(0, 8)

    const actions = []
    if (negative > 0) actions.push({ type:'recovery', text:'Kritische Bewertungen zeitnah beantworten und intern prüfen.' })
    if (topNegative[0]) actions.push({ type:'topic', text:`Häufiges Problem: ${topNegative[0].label}. Prozess verbessern.` })
    if (topPositive[0]) actions.push({ type:'marketing', text:`Starkes Lob: ${topPositive[0].label}. Für Marketing/Website nutzen.` })
    if (avg < 4 && total >= 3) actions.push({ type:'review_boost', text:'Review-Funnel optimieren und zufriedene Kunden aktivieren.' })

    const payload = {
      customer_id,
      total_reviews: total,
      avg_rating: Math.round(avg * 100) / 100,
      sentiment_score: score,
      positive_count: positive,
      neutral_count: neutral,
      negative_count: negative,
      top_positive_topics: topPositive,
      top_negative_topics: topNegative,
      recurring_issues: topNegative.filter(t => t.count >= 2),
      recurring_praises: topPositive.filter(t => t.count >= 2),
      recommended_actions: actions,
      metrics: { total, ratings },
      calculated_at: new Date().toISOString()
    }

    const profile = await safeUpsert(this.supabase, 'review_intelligence_profiles', payload, { onConflict:'customer_id' })

    await safeInsert(this.supabase, 'customer_timeline_events', {
      customer_id,
      event_type:'review_intelligence_profile_updated',
      title:'Review Intelligence aktualisiert',
      description:`${total} Bewertungen analysiert. Sentiment Score: ${score}.`,
      source_module:'review_intelligence',
      severity: negative > 0 ? 'warning' : 'info',
      actor_name:'Review Intelligence',
      metadata: payload
    })

    return profile || payload
  }

  async createTopic(payload) {
    const { data, error } = await this.supabase.from('review_topic_dictionary').insert(payload).select('*').single()
    if (error) throw error
    return data
  }

  async createTemplate(payload) {
    const { data, error } = await this.supabase.from('review_response_templates').insert(payload).select('*').single()
    if (error) throw error
    return data
  }
}

module.exports = { ReviewIntelligenceService }
