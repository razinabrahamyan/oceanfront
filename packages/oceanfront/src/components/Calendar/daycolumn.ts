import { defineComponent, h } from "vue"
import calendarProps from './props'
import { CalendarAlldayEventPlacement, CalendarEvent, CalendarEventPlacement, InternalEvent, layoutFunc, parseEvent } from '../../lib/calendar/common'
import { FormatState, useFormats } from "src/lib/formats"
import {
    getGroups,
    getEventsOfDay,
    getDayIdentifier,
    toTimestamp,
    getNormalizedTSRange,
    eventsStartingAtDay,
} from '../../lib/calendar'
import StackLayout from '../../lib/calendar/layout/stack'
import ColumnLayout from '../../lib/calendar/layout/columns'
import { DateTimeFormatterOptions } from "src/formats/DateTime"
import { BusyInfo, layoutAllday } from "src/lib/calendar/layout/allday"


function formatRange(mgr: FormatState, e: InternalEvent, withinDate: Date) {
    const [startTS, endTS] = getNormalizedTSRange(e, withinDate)
    const start = new Date(startTS.year, startTS.month, startTS.day, startTS.hours, startTS.minutes)
    const end = new Date(endTS.year, endTS.month, endTS.day, endTS.hours, endTS.minutes)
    const spansNoon = startTS.hours < 12 != endTS.hours < 12
    const opts: DateTimeFormatterOptions = {
        nativeOptions: { hour: "numeric", minute: "numeric" }
    }
    const fmt = mgr.getTextFormatter('date', opts)
    const resStart = fmt?.format(start).parts as any[]
    const resEnd = fmt?.format(end).parts as any[]
    if (!resStart || !resEnd) return ''
    const startStr = resStart.filter(p => spansNoon || p.type != "dayPeriod").map(p => p.value).join('').trim()
    const endStr = resEnd.map(p => p.value).join('').trim()
    return startStr + '-' + endStr
}

export default defineComponent({
    props: {
        ...calendarProps.internal,
        ...calendarProps.common,
    },
    emits: [
        'click:event',
    ],
    computed: {
        parsedEvents(): InternalEvent[] {
            const events: CalendarEvent[] = this.$props.events || []
            const mgr = useFormats()
            return events.map(e => parseEvent(e, mgr)).filter(e => e !== undefined) as InternalEvent[]
        },
        formatMgr: () => useFormats(),
        layoutFunc(): layoutFunc {
            return this.$props.layout === 'stack' ? StackLayout : ColumnLayout
        },
        hasAllDay(): boolean {
            return (this.$props.events?.filter((e) => e.allDay).length || 0) > 0
        },
        allDayEvents() {
            const visRange = this.visibleRange || []
            const rangeStart = getDayIdentifier(visRange[0])
            const allDayEvents = {} as any
            let busyInfo: BusyInfo = { busyColumns: [], currentColumn: 0 }
            for (const cat of this.$props.categoriesList || []) {
                const day = getDayIdentifier(toTimestamp(cat.date))
                const evs = this.$props.events
                    ? eventsStartingAtDay(
                        getEventsOfDay(this.parsedEvents, day, true, this.ignoreCategories ? undefined : cat.category, true),
                        day,
                        rangeStart
                    )
                    : []
                const layedOut = layoutAllday(evs, visRange, busyInfo)
                if (this.$props.type == 'category') busyInfo = { busyColumns: [], currentColumn: 0 }
                allDayEvents[cat.category] = layedOut
            }
            return allDayEvents
        },
        dayEvents() {
            const dayEvents = {} as any
            for (const cat of this.$props.categoriesList || []) {
                const day = getDayIdentifier(toTimestamp(cat.date))
                const threshold = parseInt(this.$props.overlapThreshold as unknown as string) || 0
                const groups = this.$props.events
                    ? getGroups(this.parsedEvents, day, false, this.ignoreCategories ? undefined : cat.category, this.layoutFunc, threshold)
                    : []
                const placements = []
                for (const g of groups) {
                    placements.push(...g.placements)
                }
                dayEvents[cat.category] = placements
            }
            return dayEvents
        },
        intervals() {
            return Array.from({ length: 24 }, (_, i) => i)
        },
    },
    methods: {
        superTitle() {
            const slot = this.$slots['super-title']
            if (!slot) return ''
            return [
                h('div', { class: "of-calendar-gutter" }),
                h('div', { class: "of-calendar-day-supertitle" }, slot()),
            ]
        },
        title() {
            if (!this.$props.categoryTitles) {
                return ''
            }
            const slot = this.$slots['category-title']
            const titles = !this.$props.categoriesList
                ? ''
                : this.$props.categoriesList.map((cat) => {
                    const theDay = cat.date

                    return h('div', { class: 'of-calendar-category-title' },
                        slot
                            ? slot({
                                categoryName: cat.category,
                                isDate: this.$props.type != 'category',
                                date: theDay,
                            })
                            : cat.category
                    )

                })
            return h('div', { class: 'of-calendar-day-titles' }, [
                h('div', { class: 'of-calendar-gutter' }),
                titles
            ])
        },
        allDayRow() {
            if (!this.hasAllDay) return ''
            const eventHeight = parseInt(this.$props.eventHeight as unknown as string) || 20
            let height = 0
            const columns = !this.$props.categoriesList
                ? ''
                : this.$props.categoriesList.map((cat) => {
                    const events = this.allDayEvents[cat.category] as CalendarAlldayEventPlacement[] || []
                    return h('div', { class: 'of-calendar-day' },
                        events.map(e => {
                            height = Math.max(e.top, height)
                            return h('div',
                                {
                                    class: 'of-calendar-event',
                                    style: {
                                        'background-color': this.$props.eventColor?.(e.event) ?? e.event.color,
                                        width: '' + ((e.daysSpan * 100) - 2) + '%',
                                        top: '' + (e.top * eventHeight) + 'px',
                                    },
                                    onClick: (event: any) => {
                                        this.$emit('click:event', event, e.event)
                                    },
                                },
                                h('strong', e.event.name),
                            )
                        })
                    )
                })
            return h('div', { class: 'of-calendar-allday-row', style: { height: '' + (height * eventHeight + eventHeight) + 'px' } }, [
                h('div', { class: 'of-calendar-gutter' }),
                columns,
            ])
        },
        dayRow() {
            const intervals = this.intervals.map(
                (interval) =>
                    h('div', { class: 'of-calendar-interval' },
                        h('div', { class: 'of-calendar-interval-label' }, interval)
                    )
            )
            const days = !this.$props.categoriesList
                ? ''
                : this.$props.categoriesList.map((cat) => {
                    const intervals = this.intervals.map(_ =>
                        h('div', {
                            class: "of-calendar-interval",
                        })
                    )
                    const es = this.dayEvents[cat.category] as CalendarEventPlacement[] || []
                    const events = es.map(e => {
                        const brk = e.event.end - e.event.start > 45
                        const separator = !brk
                            ? ' '
                            : h('br')
                        const formattedRange = formatRange(this.formatMgr, e.event, cat.date)
                        const slot = this.$slots['event-content']
                        return h('div',
                            {
                                class: {
                                    'of-calendar-event': true,
                                    conflict: e.conflict,
                                },
                                style: {
                                    'background-color': this.$props.eventColor?.(e.event) ?? e.event.color,
                                    'z-index': e.zIndex,
                                    left: e.left * 100 + '%',
                                    width: e.width * 100 + '%',
                                    top: e.top + '%',
                                    height: e.height + '%',
                                },
                                onClick: (event: any) => {
                                    this.$emit('click:event', event, e.event)
                                },
                            },
                            slot
                                ? slot({
                                    placement: e,
                                    brk,
                                    formattedRange
                                })
                                : [
                                    h('strong', e.event.name),
                                    separator,
                                    formattedRange,
                                ]
                        )
                    })

                    return h('div', { class: 'of-calendar-day' },
                        [
                            ...intervals,
                            ...events,
                        ])
                })
            return h('div', { class: 'of-calendar-day-row' }, [
                h('div', { class: 'of-calendar-gutter' }, intervals),
                days,
            ])
        },
        header() {
            const slot = this.$slots['header']
            return slot?.()
        },
    },
    render() {
        const eventHeight = parseInt(this.$props.eventHeight as unknown as string) || 20
        const conflictColor = this.$props.conflictColor || null

        return h('div',
            {
                class: "container",
                style: {
                    "--of-event-height": `${eventHeight}px`,
                    "--of-calendar-conflict-color": conflictColor,
                },
            },
            [
                this.header(),
                h('div',
                    [
                        this.superTitle(),
                        this.title(),
                        this.allDayRow(),
                        this.dayRow(),
                    ]
                )
            ]
        )
    },
})
