<template>
  <div
    tabindex="-1"
    role="menu"
    class="of-menu options"
    :class="menuClass"
    :style="menuStyle"
    @keydown="onKeyPress"
  >
    <slot
      name="header"
      :addSearch="addSearch"
      :showSearch="showSearch"
      :searchText="searchText"
    ></slot>
    <div class="search-row" v-if="showSearch && addSearch">
      <of-field
        type="text"
        v-model="searchText"
        @input="onSearchInput"
        ref="searchField"
        tabindex="0"
      >
        <template #prepend>
          <of-icon name="search" />
        </template>
        <template #append>
          <of-icon
            v-if="searchNotEmpty"
            name="cancel circle"
            style="cursor: pointer"
            size="input"
            @click="clearSearch"
          />
        </template>
      </of-field>
    </div>
    <of-nav-group>
      <div v-if="isEmpty" style="padding: 0 0.5em">
        <slot name="empty">
          {{ lang.listNoItems }}
        </slot>
      </div>
      <template v-if="!isEmpty">
        <div class="of-list-outer" ref="listOuter">
          <template v-for="(item, idx) of filterItems" :key="idx">
            <div class="of-list-header" v-if="item.special === 'header'">
              {{ item.text }}
            </div>
            <div class="of-list-divider" v-if="item.special === 'divider'" />
            <of-list-item
              v-if="!item.special"
              :active="item.selected"
              :disabled="item.disabled"
              @mousedown="(event) => click(item, event)"
              @click="(event) => click(item, event)"
              @blur="onItemBlur"
              @focus="onItemFocus"
              :attrs="item.attrs"
              :key="idx"
            >
              <slot name="option-icon" v-bind="item">
                <of-icon v-if="item.icon" :name="item.icon" size="input" />
              </slot>
              {{ item.text }}
            </of-list-item>
          </template>
        </div>
      </template>
    </of-nav-group>
    <slot
      name="footer"
      :addSearch="addSearch"
      :showSearch="showSearch"
      :searchText="searchText"
    ></slot>
  </div>
</template>

<script lang="ts">
import {
  defineComponent,
  computed,
  PropType,
  ref,
  Ref,
  nextTick,
  watch,
} from 'vue'
import { OfField } from '../components/Field'
import { OfNavGroup } from '../components/NavGroup'
import { OfListItem } from '../components/ListItem'
import { ItemsProp, useItems } from '../lib/items'
import { throttle } from '../lib/util'
import { useLanguage } from '../lib/language'

const OfOptionList = defineComponent({
  name: 'OfOptionList',
  components: {
    OfField,
    OfListItem,
    OfNavGroup,
  },
  props: {
    focus: { type: Boolean, default: false },
    class: [Object, String],
    style: [Object, String],
    items: {
      type: [String, Object, Array] as PropType<ItemsProp>,
      default: () => [],
    },
    addSearch: { type: Boolean, default: false },
  },
  emits: ['blur', 'click'],
  setup(props, ctx) {
    const itemMgr = useItems()
    const allItems = computed(() => {
      return (
        itemMgr.getItemList(props.items) || {
          items: [],
        }
      )
    })
    const isEmpty = computed(() => filterItems.value.length == 0)
    const menuClass = computed(() => props.class)
    const menuStyle = computed(() => props.style)
    const itemFocused: Ref<boolean> = ref(false)
    const listOuter = ref<any>(null)
    const lang = useLanguage()

    const searchField = ref<any>(null)
    const searchText: Ref<string> = ref('')
    const searchNotEmpty = computed(() => searchText.value !== '')
    const showSearch: Ref<boolean> = ref(false)

    const onSearchInput = (_: never, value: string) => {
      if (showSearch.value) search(value)
    }

    const search = throttle(300, (input: string) => {
      searchText.value = input.trim()
    })

    const scrollListTop = () => {
      listOuter?.value?.scroll?.(0, 0)
    }

    let prevSearchText: string | null = null
    const filterItems = computed(() => {
      const normQuery = (searchText.value || '').trim().toLowerCase()
      const showAll = normQuery === ''
      let itemList = allItems.value.items.filter((item) => {
        if (item.special) return true
        if (item.value !== undefined) {
          const optionText: string = item.text
          return showAll || optionText.toLowerCase().includes(normQuery)
        }
      })
      //Remove empty special items
      itemList = itemList.filter((item, index) => {
        if (item.special) {
          const nextItem = itemList[index + 1] ?? null
          return nextItem && !nextItem.special
        } else {
          return true
        }
      })
      if (normQuery !== prevSearchText) scrollListTop()
      prevSearchText = normQuery
      return itemList
    })

    const clearSearch = () => {
      searchText.value = ''
    }

    watch(
      () => props.focus,
      (val) => {
        if (val) focusFirstItem()
      }
    )

    const onKeyPress = (evt: KeyboardEvent) => {
      let consumed = false

      if (evt.key === 'Escape') {
        if (showSearch.value && searchText.value !== '') {
          consumed = true
          searchText.value = ''
        } else {
          ctx.emit('blur')
        }
      } else if (
        ['ArrowUp', 'ArrowDown'].includes(evt.key) &&
        !itemFocused.value
      ) {
        consumed = true
        focusFirstItem(true)
      } else if (
        (evt.key === 'Backspace' ||
          /(^Key([A-Z]$))/.test(evt.code) ||
          /(^Digit([0-9]$))/.test(evt.code)) &&
        !evt.altKey &&
        !evt.metaKey &&
        !evt.ctrlKey
      ) {
        if (props.addSearch && !isEmpty.value) {
          showSearch.value = true
          nextTick(() => {
            focusSearch()
          })
        }
      }

      if (consumed) {
        evt.stopPropagation()
        evt.preventDefault()
      }
    }

    const focusSearch = () => {
      searchField?.value?.$el.querySelector('input')?.focus()
    }

    const onItemFocus = () => {
      itemFocused.value = true
    }

    const onItemBlur = () => {
      nextTick(() => {
        if (!itemFocused.value) blurList()
      })
      itemFocused.value = false
    }

    const blurList = () => {
      filterItems.value.forEach((item) => {
        if (item.attrs?.hasOwnProperty('isFocused')) {
          item.attrs.isFocused = false
        }
      })
      ctx.emit('blur')
    }

    const click = (item: any, event: Event): any => {
      if (item.disabled) return
      ctx.emit('click', item.value, item, event)
      showSearch.value = false
      searchText.value = ''
    }

    const focusFirstItem = (ignoreSelected = false) => {
      if (filterItems.value.length == 0) return

      const selected = filterItems.value.findIndex(
        (item) => item.selected && item.selected === true
      )

      if (!ignoreSelected && selected !== -1) {
        filterItems.value[selected].attrs = {
          ...filterItems.value[selected].attrs,
          ...{ isFocused: true },
        }
      } else {
        scrollListTop()

        filterItems.value.some((item) => {
          if (!item.special) {
            item.attrs = { ...item.attrs, ...{ isFocused: true } }
            return true
          }
        })
      }
    }

    nextTick(() => {
      focusFirstItem()
    })

    return {
      lang,
      isEmpty,
      filterItems,
      menuClass,
      menuStyle,
      click,
      listOuter,

      searchField,
      searchText,
      onSearchInput,
      searchNotEmpty,
      clearSearch,
      showSearch,
      onKeyPress,

      onItemBlur,
      onItemFocus,
    }
  },
})

export default OfOptionList
</script>
