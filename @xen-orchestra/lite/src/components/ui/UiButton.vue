<template>
  <button :class="className" :disabled="busy || isDisabled" :type="type || 'button'" class="ui-button">
    <UiSpinner v-if="busy" />
    <template v-else>
      <UiIcon :icon="icon" class="icon" />
      <slot />
    </template>
  </button>
</template>

<script lang="ts" setup>
import UiSpinner from '@/components/ui/UiSpinner.vue'
import { useContext } from '@/composables/context.composable'
import { ColorContext, DisabledContext } from '@/context'
import { IK_BUTTON_GROUP_OUTLINED, IK_BUTTON_GROUP_TRANSPARENT } from '@/types/injection-keys'
import { computed, inject } from 'vue'
import type { Color } from '@/types'
import type { IconDefinition } from '@fortawesome/fontawesome-common-types'
import UiIcon from '@/components/ui/icon/UiIcon.vue'

const props = withDefaults(
  defineProps<{
    type?: 'button' | 'reset' | 'submit'
    busy?: boolean
    disabled?: boolean
    icon?: IconDefinition
    color?: Color
    outlined?: boolean
    transparent?: boolean
    active?: boolean
  }>(),
  {
    disabled: undefined,
    outlined: undefined,
    transparent: undefined,
  }
)

const isDisabled = useContext(DisabledContext, () => props.disabled)

const isGroupOutlined = inject(
  IK_BUTTON_GROUP_OUTLINED,
  computed(() => false)
)

const isGroupTransparent = inject(
  IK_BUTTON_GROUP_TRANSPARENT,
  computed(() => false)
)

const { name: contextColor } = useContext(ColorContext, () => props.color)

const className = computed(() => {
  return [
    `color-${contextColor.value}`,
    {
      busy: props.busy,
      active: props.active,
      disabled: isDisabled.value,
      outlined: props.outlined ?? isGroupOutlined.value,
      transparent: props.transparent ?? isGroupTransparent.value,
    },
  ]
})
</script>

<style lang="postcss" scoped>
.ui-button {
  font-size: 1.6rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5em;
  padding: 0 0.75em;
  cursor: pointer;
  vertical-align: middle;
  color: var(--button-color);
  border: 1px solid var(--button-border-color);
  border-radius: 0.5em;
  background-color: var(--button-background-color);
  gap: 0.75em;

  &:not(.transparent) {
    box-shadow: var(--shadow-100);
  }

  &.color-info {
    --button-accent-color: var(--color-purple-base);
    --button-accent-color-hover: var(--color-purple-d20);
    --button-accent-color-active: var(--color-purple-d40);
  }

  &.color-success {
    --button-accent-color: var(--color-green-base);
    --button-accent-color-hover: var(--color-green-d20);
    --button-accent-color-active: var(--color-green-d40);
  }

  &.color-warning {
    --button-accent-color: var(--color-orange-base);
    --button-accent-color-hover: var(--color-orange-d20);
    --button-accent-color-active: var(--color-orange-d40);
  }

  &.color-error {
    --button-accent-color: var(--color-red-base);
    --button-accent-color-hover: var(--color-red-d20);
    --button-accent-color-active: var(--color-red-d40);
  }

  &:hover {
    --button-accent-color: var(--button-accent-color-hover);
  }

  &:active,
  &.active,
  &.busy {
    --button-accent-color: var(--button-accent-color-active);
  }

  --button-color: var(--color-grey-600);
  --button-border-color: transparent;
  --button-background-color: var(--button-accent-color);

  &.outlined {
    --button-color: var(--button-accent-color);
    --button-border-color: var(--button-accent-color);
    --button-background-color: var(--background-color-primary);
  }

  &.transparent {
    --button-color: var(--button-accent-color);
    --button-border-color: transparent;
    --button-background-color: transparent;
  }

  &.busy {
    cursor: not-allowed;
  }

  &.disabled {
    cursor: not-allowed;
    --button-color: var(--color-grey-500);
    --button-border-color: transparent;
    --button-background-color: var(--background-color-secondary);
  }
}

.icon {
  font-size: 0.8em;
}

.loader {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.5em;
  height: 1.5em;
  animation: spin 1s infinite linear;
  border-radius: 0.75em;

  background: conic-gradient(
    from 90deg at 50% 50%,
    rgba(255, 255, 255, 0) 0deg,
    rgba(255, 255, 255, 0) 0.04deg,
    var(--button-color) 360deg
  );

  &::after {
    width: 1.2em;
    height: 1.2em;
    content: '';
    border-radius: 0.6em;
    background-color: var(--button-background-color);
  }
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
