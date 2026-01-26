import { createRouter } from '@nanostores/router'

export const $router = createRouter({
  home: '/',
  setup: '/setup',
  login: '/login',
  dashboard: '/dashboard',
  collections: '/collections',
  collection: '/collections/:slug',
  newDocument: '/collections/:slug/new',
  editDocument: '/collections/:slug/edit/:id'
})
