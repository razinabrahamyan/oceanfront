import { PropType, computed, defineComponent, h, VNode } from 'vue'
import { OfIcon } from './Icon'
import { FieldMode } from '../lib/fields'
export const RadioInner = defineComponent({
  props: {
    switch: Boolean,
    checked: [Boolean, Number],
    label: String,
    inputId: String,
    align: String,
    name: String,
    mode: String as PropType<FieldMode>,
  },
  emits: ['focus', 'blur', 'inputMounted'],
  setup(props, ctx) {
    const icon = computed(() => {
      const checked = !!props.checked
      return 'radio' + (checked ? ' checked' : '')
    })
    console.log(icon, 'icooooooooooooon')
    const hooks = {
      onFocus() {
        ctx.emit('focus')
      },
      onBlur() {
        ctx.emit('blur')
      },
      onVnodeMounted(vnode: VNode) {
        ctx.emit('inputMounted', vnode)
      },
    }
    console.log(ctx.slots.icon, 'ctx.slots.icon')
    return () => {
      const inputLabel = props.label
      const label = inputLabel
        ? h(
            'label',
            {
              class: [
                'of-field-content-text',
                'of--align-' + (props.align || 'start'),
              ],
              for: props.inputId,
              onClick: (evt: MouseEvent) => evt.stopPropagation(),
            },
            [inputLabel]
          )
        : undefined
      const inner = [
        h('div', { class: 'of-toggle-input' }, [
          h('input', {
            class: 'of-field-input',
            checked: props.checked,
            id: props.inputId,
            // disabled: disabled.value,
            tabindex: props.mode === 'fixed' ? -1 : 0,
            name: props.name,
            type: 'radio',
            value: '1',
            ...hooks,
          }),
          props.switch
            ? h('div', { class: 'of-switch' }, [
                h('div', { class: 'of-switch-track' }),
                h('div', { class: 'of-switch-thumb' }),
              ])
            : ctx.slots.icon
            ? ctx.slots.icon(props.checked)
            : h(OfIcon, {
                class: 'of-toggle-icon',
                name: icon.value,
                size: 'input',
              }),
        ]),
      ]
      if (label) inner.push(label)
      return [
        h(
          'div',
          {
            class: 'of-toggle-wrapper',
          },
          inner
        ),
      ]
    }
  },
  created() {
    console.log(this.$props, 'yahaaaaaaaaay blya')
  },
})
