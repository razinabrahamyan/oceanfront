import { computed, defineComponent, h, PropType, ref, VNode } from 'vue'
import { FieldMode, newFieldId } from '../lib/fields'
import { FormRecord, useRecords } from '../lib/records'
import { ToggleInner } from './ToggleInner'

export const OfToggle = defineComponent({
  name: 'OfToggle',
  inheritAttrs: false,
  props: {
    checked: { type: [Boolean, Number], default: false },
    id: String,
    initialValue: { type: Boolean, default: undefined },
    inputType: String,
    label: String,
    loading: Boolean,
    locked: Boolean,
    mode: String as PropType<FieldMode>,
    muted: Boolean,
    name: String,
    readonly: Boolean,
    record: Object as PropType<FormRecord>,
    required: Boolean,
    switch: Boolean,
    value: String,
    size: [String, Number],
  },
  emits: {
    'update:checked': null,
  },
  setup(props, ctx) {
    const defaultId = newFieldId()
    const recordMgr = useRecords()
    const record = computed(() => {
      return props.record || recordMgr.getCurrentRecord() || undefined
    })
    console.log(props.size, 'toggle')
    const inputId = computed(() => props.id || defaultId)
    const value = computed(() => {
      const val =
        props.name && record.value
          ? record.value.value[props.name]
          : props.checked

      return typeof val === 'number' ? Boolean(val) : val
    })
    const locked = computed(() => props.locked || record.value?.locked)
    const focused = ref(false)
    const elt = ref<HTMLInputElement | undefined>()
    const handlers = {
      onBlur(_evt: FocusEvent) {
        focused.value = false
      },
      onFocus(_evt: FocusEvent) {
        focused.value = true
      },
      onClick() {
        const val = !value.value
        if (props.name && record.value) record.value.value[props.name] = val
        else ctx.emit('update:checked', val)
      },
    }

    const setElt = (e: VNode) => {
      elt.value = e.el as HTMLInputElement
    }

    return () => {
      const content = h(ToggleInner, {
        switch: props.inputType === 'switch' || props.switch,
        checked: !!value.value,
        label: props.label,
        inputId: inputId.value,
        name: props.name,
        size: props.size,
        onInputMounted: setElt,
      })
      return h(
        'div',
        {
          class: [
            'of-toggle',
            'of-field',
            {
              'of--active': true,
              'of--focused': focused.value,
              'of--muted': props.muted,
              'of--locked': locked.value,
              'of--checked': !!value.value,
            },
          ],
          tabIndex: -1,
          ...handlers,
        },
        content
      )
    }
  },
})
