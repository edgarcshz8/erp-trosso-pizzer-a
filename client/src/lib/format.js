export const formatCLP = (n) => `$${Math.round(n || 0).toLocaleString('es-CL')}`

export const formatDate = (d) => {
  if (!d) return ''
  try {
    return new Date(d).toLocaleDateString('es-CL')
  } catch {
    return d
  }
}

export const formatDateTime = (d) => {
  if (!d) return ''
  try {
    return new Date(d).toLocaleString('es-CL')
  } catch {
    return d
  }
}

export const formatMonthYear = (month, year) => {
  const months = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${months[month - 1]} ${year}`
}
