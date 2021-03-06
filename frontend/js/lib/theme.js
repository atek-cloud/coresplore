const THEMES = ['vanilla-light']

export function get () {
  let v = localStorage.getItem('theme')
  return THEMES.includes(v) ? v : 'vanilla-light'
}

export function set (v) {
  if (!THEMES.includes(v)) return
  document.body.classList.remove(`theme-${get()}`)
  localStorage.setItem('theme', v)
  document.body.classList.add(`theme-${v}`)
}