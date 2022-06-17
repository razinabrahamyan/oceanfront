import { useConfig } from '../lib/config'
import { computed, defineComponent, h, ref, watch } from 'vue'
import { OfFieldBase } from '../components/FieldBase'
import { OfIcon } from '../components/Icon'
import OfOptionList from '../components/OptionList.vue'
import {
  BaseFieldProps,
  fieldRender,
  makeFieldContext,
  newFieldId,
  provideFieldRender,
} from '../lib/fields'
import { useItems } from '../lib/items'

type ActiveItem = { text?: string; [key: string]: any }

export const OfSelectField = defineComponent({
  name: 'OfSelectField',
  props: BaseFieldProps,
  setup(props, ctx) {
    const config = useConfig()
    const itemMgr = useItems(config)
    const fieldCtx = makeFieldContext(props, ctx)

    const initialValue = computed(() => {
      let initial = fieldCtx.initialValue
      if (initial === undefined) initial = props.defaultValue
      return initial ?? null
    })

    const searchText = ref()
    const inputValue = ref()
    const pendingValue = ref() // store selected but unconfirmed value
    const stateValue = ref()
    watch(
      () => fieldCtx.value,
      (val) => {
        if (val === undefined || val === '') val = null
        inputValue.value = val
        stateValue.value = val
        pendingValue.value = undefined
      },
      {
        immediate: true,
      }
    )

    const elt = ref<HTMLElement | undefined>()
    const focused = ref(false)
    let defaultFieldId: string
    const inputId = computed(() => {
      let id = fieldCtx.id
      if (!id) {
        if (!defaultFieldId) defaultFieldId = newFieldId()
        id = defaultFieldId
      }
      return id
    })
    const opened = ref(false)
    const items = computed(() => {
      const result = {
        disabledKey: 'disabled',
        items: [],
        specialKey: 'special',
        textKey: 'text',
        selectedTextKey: 'selectedText',
        valueKey: 'value',
        iconKey: 'icon',
      }
      let items
      if (props.name && props.record) {
        items = props.record.metadata[props.name]?.items
      }
      if (!items) items = props.items
      const list = itemMgr.getItemList(items)
      if (list) {
        Object.assign(result, list)
      }
      return result
    })
    const activeItem = computed(() => {
      const resolved = items.value
      const value = inputValue.value
      let cmpVal
      let found: { idx?: number; item?: ActiveItem } = {}
      let idx = 0
      for (const item of resolved.items) {
        if (typeof item === 'string') {
          cmpVal = item
        } else if (typeof item === 'object') {
          if (item[resolved.specialKey]) {
            idx++
            continue
          }
          cmpVal = (item as any)[resolved.valueKey]
        }
        if (cmpVal === '') cmpVal = null
        if (cmpVal === value) {
          if (typeof item === 'string') {
            found = { idx, item: { value: item, text: item } }
          } else {
            found = { idx, item }
          }
          break
        }
        idx++
      }
      return found
    })
    const formatItems = computed(() => {
      const active = activeItem.value
      const resolved = items.value
      const rows = []
      let idx = 0
      for (const item of resolved.items) {
        if (typeof item === 'string') {
          rows.push({
            disabled: false,
            text: item,
            selected: active.idx === idx,
            value: item,
          })
        } else if (typeof item === 'object') {
          rows.push({
            disabled: item[resolved.disabledKey],
            text: item[resolved.textKey],
            selectedText: item[resolved.selectedTextKey],
            value: item[resolved.valueKey],
            selected: active.idx === idx,
            special: item[resolved.specialKey],
            icon: item[resolved.iconKey] ?? '',
          })
        }
        idx++
      }
      return rows
    })

    let closing: number | null = null
    const clickOpen = (_evt?: MouseEvent) => {
      if (opened.value) {
        closePopup()
      } else if (fieldCtx.editable && !closing) {
        opened.value = true
      }
      return false
    }
    const closePopup = (refocus?: boolean) => {
      if (opened.value) {
        opened.value = false
        if (closing) clearTimeout(closing)
        closing = window.setTimeout(() => {
          closing = null
        }, 150)
        if (refocus) focus()
      }
    }
    const focus = () => {
      const curelt = elt.value
      if (curelt) curelt.focus()
    }
    const setValue = (val: any) => {
      inputValue.value = val
      fieldCtx.onUpdate?.(val)
      closePopup(true)
    }
    const hooks = {
      onBlur(_evt: FocusEvent) {
        focused.value = false
      },
      onFocus(_evt: FocusEvent) {
        focused.value = true
        searchText.value = ''
      },
      onKeydown(evt: KeyboardEvent) {
        if (evt.key == ' ' || evt.key == 'ArrowUp' || evt.key == 'ArrowDown') {
          clickOpen()
          evt.preventDefault()
          evt.stopPropagation()
        } /*else if (
          formatItems.value.length &&
          (/(^Key([A-Z]$))/.test(evt.code) ||
            /(^Digit([0-9]$))/.test(evt.code)) &&
          !evt.altKey &&
          !evt.metaKey &&
          !evt.ctrlKey
        ) {
          searchText.value += evt.key
          for (let i = 0; i < formatItems.value.length; i++) {
            const option = formatItems.value[i]
            if (option.value !== undefined) {
              const optionText: string = option.text
              if (
                optionText
                  .substring(0, searchText.value.length)
                  .toLowerCase() == searchText.value.toLowerCase()
              ) {
                setValue(option.value)
                return
              }
            }
          }
        }*/
      },
    }

    const slots = {
      append: () => {
        if (fieldCtx.editable || fieldCtx.mode === 'locked')
          return h(OfIcon, {
            class: 'of-select-icon',
            name: opened.value ? 'bullet up' : 'bullet down',
            size: 'input',
          })
      },
      interactiveContent: () => {
        const label =
          activeItem.value.item?.selectedText ||
          activeItem.value.item?.text ||
          ''

        return [
          h(
            'div',
            {
              class: [
                'of-field-content-text',
                'of--align-' + (props.align || 'start'),
              ],
              id: inputId.value,
              ref: elt,
              tabindex: 0,
              ...hooks,
            },
            [label]
          ),
        ]
      },
    }

    const fRender = fieldRender({
      blank: computed(() => {
        if (!activeItem.value.item) return true
        const val = inputValue.value
        return val === undefined || val === null || val === ''
      }),
      class: 'of-select-field',
      click: clickOpen,
      cursor: computed(() => (fieldCtx.editable ? 'pointer' : null)),
      focus,
      focused,
      inputId,
      inputValue,
      pendingValue,
      popup: {
        content: () =>
          opened.value
            ? h(OfOptionList, {
                items: formatItems.value,
                class: 'of--elevated-1',
                onClick: setValue,
              })
            : undefined,
        visible: opened,
        onBlur: closePopup,
      },
      updated: computed(() => initialValue.value !== stateValue.value),
      value: stateValue,
    })
    provideFieldRender(fRender)

    const render = () => {
      return h(OfFieldBase, props, { ...slots, ...ctx.slots })
    }
    return render
  },
})
