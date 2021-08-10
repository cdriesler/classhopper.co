import { DirectionalElement, GraphElement, GripElement, SelectionElement, VisibleElement } from './common'
import { NumberSliderData } from './extra'
import { ElementDataEntry } from './ElementDataEntry'

export type ElementData = {
    'static-component': GraphElement & GripElement & VisibleElement
    'static-parameter': GraphElement & GripElement & VisibleElement
    'number-slider': GraphElement & GripElement & VisibleElement & NumberSliderData
    'panel': VisibleElement & GripElement
    'wire': VisibleElement & DirectionalElement
    'region': VisibleElement & DirectionalElement & SelectionElement
    'annotation': VisibleElement
} & ElementDataEntry