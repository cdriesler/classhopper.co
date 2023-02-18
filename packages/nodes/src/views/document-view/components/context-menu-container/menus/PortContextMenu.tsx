import React, { useCallback } from 'react'
import { useDispatch, useStore } from '$'
import type { ContextMenu, PortContextMenuContext } from '../types'
import { MenuBody, MenuButton } from '../common'
import { COLORS } from '@/constants'
import { PortTypeIcon } from '@/components/icons'
import { getMenuHeight } from '../utils'

type PortContextMenuProps = {
    position: ContextMenu['position']
    context: PortContextMenuContext
}

export const PortContextMenu = ({ position, context }: PortContextMenuProps) => {
    const { nodeInstanceId, portInstanceId, portTemplate } = context
    const { x: left, y: top } = position
    const { __direction: direction, name, nickName } = portTemplate

    const { apply } = useDispatch()

    const menuHeight = getMenuHeight(context)
    document.documentElement.style.setProperty('--np-active-menu-height', `${menuHeight}px`)

    const isPinned = useStore((state) => state.document.configuration.pinnedPorts.some((pin) => pin.nodeInstanceId === nodeInstanceId && pin.portInstanceId === portInstanceId))
    const allowPin = direction === 'input'

    const pinIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} vectorEffect="non-scaling-stroke" stroke={COLORS.DARK} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 19.5l-15-15m0 0v11.25m0-11.25h11.25" />
    </svg>


    const handlePin = useCallback(() => {
        apply((state) => {
            state.document.configuration.pinnedPorts.push({
                nodeInstanceId,
                portInstanceId
            })
        })
    }, [])

    const unpinIcon = <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} vectorEffect="non-scaling-stroke" stroke={COLORS.DARK} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 4.5l15 15m0 0V8.25m0 11.25H8.25" />
    </svg>


    const handleUnpin = useCallback(() => {
        apply((state) => {
            state.document.configuration.pinnedPorts = state.document.configuration.pinnedPorts.filter((pin) => {
                const sameNode = pin.nodeInstanceId === nodeInstanceId
                const samePort = pin.portInstanceId === portInstanceId

                return !sameNode && !samePort
            })
        })
    }, [])

    return (
        <MenuBody position={position}>
            <div className='np-w-full np-flex np-flex-col np-justify-start'>
                <div className='np-w-full np-flex np-items-center np-pl-1 np-h-8 np-mb-1 np-border-2 np-border-dark np-rounded-sm'>
                    <PortTypeIcon />
                    <p className='np-pl-2 np-font-sans np-font-medium np-text-dark np-text-sm -np-translate-y-px'>
                        {`${name} (${nickName})`}
                    </p>

                </div>
            </div>
            {allowPin
                ? isPinned
                    ? <MenuButton icon={unpinIcon} label="Unpin" action={handleUnpin} />
                    : <MenuButton icon={pinIcon} label="Pin" action={handlePin} />
                : null
            }
        </MenuBody>
    )
}

export default PortContextMenu