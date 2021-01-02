import { Glasshopper } from 'glib'
import { GraphAction, GraphStore } from './../types'
import { newGuid } from '@/utils'

export const reducer = (state: GraphStore, action: GraphAction): GraphStore => {
  switch (action.type) {
    case 'demo': {
      return state
    }
    case 'session/register-socket': {
      const { socket, id } = action

      console.debug(`Registered socket connection ${id}.`)

      socket.on('join-session-handshake', (message: string) => {
        console.debug(message)
      })

      socket.emit('join-session', id)

      state.socket = {
        io: socket,
        id
      }

      return state
    }
    case 'session/load-components': {
      if (state.preflight.getLibrary) {
        return state
      }

      const { components } = action

      state.preflight.getLibrary = true

      components.forEach((component) => {
        const { category, subcategory } = component

        const libraryCategory = state.library[category.toLowerCase()]
        const librarySubcategory = subcategory.toLowerCase()

        if (!libraryCategory[librarySubcategory]) {
          libraryCategory[librarySubcategory] = []
        }

        libraryCategory[librarySubcategory].push(component)
      })

      return { ...state }
    }
    case 'session/restore-session': {
      state.preflight.getSession = true

      if (action.elements === 'none') {
        return { ...state }
      }

      const elements: { [key: string]: Glasshopper.Element.Base } = JSON.parse(action.elements)

      state.elements = elements

      return { ...state }
    }
    case 'session/set-ready': {
      state.ready = true
      return { ...state }
    }
    case 'graph/add-component': {
      const { position, component } = action
      const guid = newGuid()

      const element = new Glasshopper.Element.StaticComponent(guid, position, component)

      state.elements[element.id] = element

      // TODO: This is to limit data sent over the socket server. Find a better way.
      delete (state.elements[element.id] as Glasshopper.Element.StaticComponent).template.icon

      state.socket.io.emit('update-graph', JSON.stringify(state.elements))

      return { ...state }
    }
  }
}