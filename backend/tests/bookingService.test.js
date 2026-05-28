const test = require('node:test')
const assert = require('node:assert/strict')
const { computeSlots, _hmToMin, _minToHm } = require('../src/services/bookingService')

test('hmToMin / minToHm: Roundtrip', () => {
  assert.equal(_hmToMin('09:30'), 570)
  assert.equal(_minToHm(570), '09:30')
  assert.equal(_hmToMin('00:00'), 0)
  assert.equal(_minToHm(0), '00:00')
  assert.equal(_hmToMin('invalid'), null)
})

test('computeSlots: leerer Tag 09:00-12:00, 60min, 60min-Raster -> 09:00,10:00,11:00', () => {
  const slots = computeSlots({
    businessHours: [{ open: '09:00', close: '12:00' }],
    busy: [],
    serviceDuration: 60,
    bufferAfter: 0,
    granularity: 60
  })
  assert.deepEqual(slots.map(_minToHm), ['09:00', '10:00', '11:00'])
})

test('computeSlots: 30min-Service, 15min-Raster, 09:00-10:00 -> 09:00,09:15,09:30', () => {
  const slots = computeSlots({
    businessHours: [{ open: '09:00', close: '10:00' }],
    busy: [],
    serviceDuration: 30,
    granularity: 15
  })
  assert.deepEqual(slots.map(_minToHm), ['09:00', '09:15', '09:30'])
})

test('computeSlots: belegter Slot wird ausgeschlossen', () => {
  // 09:00-12:00, 60min Service, 60min-Raster, belegt 10:00-11:00
  const slots = computeSlots({
    businessHours: [{ open: '09:00', close: '12:00' }],
    busy: [{ start: _hmToMin('10:00'), end: _hmToMin('11:00') }],
    serviceDuration: 60,
    granularity: 60
  })
  // 09:00 ok, 10:00 overlap, 11:00 ok
  assert.deepEqual(slots.map(_minToHm), ['09:00', '11:00'])
})

test('computeSlots: Buffer verhindert direkt anschliessenden Slot', () => {
  // 60min Service + 30min Buffer = 90min Bedarf. 09:00-11:00, 30min-Raster.
  // 09:00 belegt 09:00-10:30; naechster freier Start ist 10:30? Nein,
  // 10:30+60=11:30 > 11:00 close. Pruefen wir nur dass 09:00 + 09:30 sich
  // nicht ueberlappen wenn 09:00 gebucht waere.
  const slots = computeSlots({
    businessHours: [{ open: '09:00', close: '11:00' }],
    busy: [{ start: _hmToMin('09:00'), end: _hmToMin('10:30') }],  // 60min+30buffer
    serviceDuration: 60,
    bufferAfter: 30,
    granularity: 30
  })
  // 09:00 belegt. 09:30 -> 09:30-11:00 overlap mit busy bis 10:30 -> raus.
  // 10:00 -> overlap. 10:30 -> 10:30-12:00, aber 10:30+60=11:30 > 11:00 -> raus.
  assert.deepEqual(slots, [])
})

test('computeSlots: Service muss bis close passen (ohne Buffer)', () => {
  // 09:00-10:00, 45min Service, 15min-Raster.
  // 09:00 (bis 09:45 ok), 09:15 (bis 10:00 ok), 09:30 (bis 10:15 > close) raus
  const slots = computeSlots({
    businessHours: [{ open: '09:00', close: '10:00' }],
    busy: [],
    serviceDuration: 45,
    granularity: 15
  })
  assert.deepEqual(slots.map(_minToHm), ['09:00', '09:15'])
})

test('computeSlots: zwei Bloecke (Mittagspause) werden beide bedient', () => {
  const slots = computeSlots({
    businessHours: [{ open: '09:00', close: '11:00' }, { open: '14:00', close: '16:00' }],
    busy: [],
    serviceDuration: 60,
    granularity: 60
  })
  assert.deepEqual(slots.map(_minToHm), ['09:00', '10:00', '14:00', '15:00'])
})

test('computeSlots: earliestStartMinute (Lead-Time) schneidet fruehe Slots ab', () => {
  // 09:00-12:00, 60min, 60min-Raster, aber frueester Start 10:00.
  const slots = computeSlots({
    businessHours: [{ open: '09:00', close: '12:00' }],
    busy: [],
    serviceDuration: 60,
    granularity: 60,
    earliestStartMinute: _hmToMin('10:00')
  })
  assert.deepEqual(slots.map(_minToHm), ['10:00', '11:00'])
})

test('computeSlots: earliestStartMinute wird auf Raster aufgerundet', () => {
  // frueester Start 10:10 -> auf 10:15 aufgerundet bei 15min-Raster
  const slots = computeSlots({
    businessHours: [{ open: '09:00', close: '11:00' }],
    busy: [],
    serviceDuration: 30,
    granularity: 15,
    earliestStartMinute: _hmToMin('10:10')
  })
  assert.equal(slots[0], _hmToMin('10:15'))
})

test('computeSlots: ungueltige Hours (close <= open) liefern keine Slots', () => {
  const slots = computeSlots({
    businessHours: [{ open: '12:00', close: '09:00' }],
    busy: [],
    serviceDuration: 30,
    granularity: 15
  })
  assert.deepEqual(slots, [])
})

test('computeSlots: teil-ueberlappende Belegung blockt korrekt', () => {
  // 09:00-12:00, 60min, 30min-Raster, belegt 09:30-10:30
  const slots = computeSlots({
    businessHours: [{ open: '09:00', close: '12:00' }],
    busy: [{ start: _hmToMin('09:30'), end: _hmToMin('10:30') }],
    serviceDuration: 60,
    granularity: 30
  })
  // 09:00 (09:00-10:00 overlap mit 09:30+) raus
  // 09:30 overlap, 10:00 overlap (10:00-11:00 vs busy bis 10:30) raus
  // 10:30 (10:30-11:30) ok, 11:00 (11:00-12:00) ok
  assert.deepEqual(slots.map(_minToHm), ['10:30', '11:00'])
})
