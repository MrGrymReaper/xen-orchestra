<template>
  <Teleport to="body">
    <form class="ui-modal" v-bind="$attrs" @click.self="modal.decline()">
      <slot />
    </form>
  </Teleport>
</template>

<script lang="ts" setup>
import { useContext } from '@/composables/context.composable'
import { ColorContext, DisabledContext } from '@/context'
import type { Color } from '@/types'
import { IK_MODAL } from '@/types/injection-keys'
import { useMagicKeys, whenever } from '@vueuse/core'
import { inject } from 'vue'

const props = defineProps<{
  color?: Color
  disabled?: boolean
}>()

defineOptions({
  inheritAttrs: false,
})

const modal = inject(IK_MODAL)!

useContext(ColorContext, () => props.color)
useContext(DisabledContext, () => props.disabled || modal.isBusy)

const { escape } = useMagicKeys()

whenever(escape, () => modal.decline())
</script>

<style lang="postcss" scoped>
.ui-modal {
  position: fixed;
  z-index: 2;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  display: flex;
  overflow: auto;
  align-items: center;
  justify-content: center;
  background: rgba(26, 27, 56, 0.25);
  flex-direction: column;
  gap: 2rem;
  font-size: 1.6rem;
  font-weight: 400;
}
</style>
