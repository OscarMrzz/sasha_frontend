import { expect, test } from '@playwright/test'
import { hora12, horaRango12 } from '../../lib/examenes'

test.describe('hora12', () => {
  test('formatea medianoche', () => {
    expect(hora12('00:00')).toBe('12:00 am')
    expect(hora12('00:30')).toBe('12:30 am')
  })

  test('formatea horas de la mañana', () => {
    expect(hora12('08:00')).toBe('08:00 am')
    expect(hora12('11:59')).toBe('11:59 am')
  })

  test('formatea mediodía', () => {
    expect(hora12('12:00')).toBe('12:00 pm')
    expect(hora12('12:30')).toBe('12:30 pm')
  })

  test('formatea horas de la tarde y noche', () => {
    expect(hora12('13:00')).toBe('01:00 pm')
    expect(hora12('15:45')).toBe('03:45 pm')
    expect(hora12('20:00')).toBe('08:00 pm')
    expect(hora12('23:59')).toBe('11:59 pm')
  })

  test('respeta minutos distintos de cero', () => {
    expect(hora12('08:05')).toBe('08:05 am')
    expect(hora12('16:09')).toBe('04:09 pm')
  })

  test('devuelve cadena vacía para valores nulos o vacíos', () => {
    expect(hora12('')).toBe('')
    expect(hora12(undefined)).toBe('')
    expect(hora12(null)).toBe('')
  })
})

test.describe('horaRango12', () => {
  test('formatea rangos en la misma mitad del día', () => {
    expect(horaRango12('08:00', '09:30')).toBe('08:00 am – 09:30 am')
  })

  test('formatea rangos que cruzan el mediodía', () => {
    expect(horaRango12('11:00', '13:00')).toBe('11:00 am – 01:00 pm')
  })

  test('devuelve guion largo cuando ambos lados están vacíos', () => {
    expect(horaRango12('', '')).toBe('—')
    expect(horaRango12(undefined, undefined)).toBe('—')
    expect(horaRango12(null, null)).toBe('—')
  })

  test('devuelve la hora disponible cuando falta un lado del rango', () => {
    expect(horaRango12('', '09:00')).toBe('09:00 am')
    expect(horaRango12(undefined, '09:00')).toBe('09:00 am')
    expect(horaRango12('08:00', '')).toBe('08:00 am')
    expect(horaRango12('08:00', undefined)).toBe('08:00 am')
  })

  test('devuelve una sola hora cuando inicio y fin son iguales', () => {
    expect(horaRango12('08:00', '08:00')).toBe('08:00 am')
  })
})
