
'use client'

import React from 'react'

export type ResponsiveColumn<T> = {
  key: keyof T | string
  label: string
  render?: (row: T) => React.ReactNode
  priority?: 'primary' | 'secondary' | 'meta'
}

export default function ResponsiveDataView<T extends Record<string, any>>({
  rows,
  columns,
  empty = 'Keine Daten vorhanden.'
}: {
  rows: T[]
  columns: ResponsiveColumn<T>[]
  empty?: string
}) {
  if (!rows?.length) return <p className="responsiveDataEmpty">{empty}</p>

  return (
    <div className="responsiveDataView">
      <div className="responsiveTableWrap">
        <table>
          <thead>
            <tr>{columns.map(col => <th key={String(col.key)}>{col.label}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={row.id || idx}>
                {columns.map(col => (
                  <td key={String(col.key)}>{col.render ? col.render(row) : row[col.key]}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="responsiveCardList">
        {rows.map((row, idx) => {
          const primary = columns.find(c => c.priority === 'primary') || columns[0]
          const meta = columns.filter(c => c !== primary)
          return (
            <article className="responsiveDataCard" key={row.id || idx}>
              <strong>{primary.render ? primary.render(row) : row[primary.key]}</strong>
              <div>
                {meta.map(col => (
                  <p key={String(col.key)}>
                    <span>{col.label}</span>
                    <em>{col.render ? col.render(row) : row[col.key]}</em>
                  </p>
                ))}
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
