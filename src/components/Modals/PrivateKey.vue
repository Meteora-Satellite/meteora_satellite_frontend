<script setup lang="ts">
import { ref, defineProps, defineEmits, watch } from 'vue';
import {
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogRoot,
  AlertDialogTitle
} from 'reka-ui'
import { apiClient } from '@/services/api';
import ShimmerButton from '../ui/shimmer-button/ShimmerButton.vue';
import Button from '../ui/button/Button.vue';
import { Copy } from 'lucide-vue-next';
import { toast } from 'vue-sonner';

const showToken = async () => {
	const request = await apiClient.getPrivateKey()
	key.value = request.data
}

const props = defineProps<{
  open: boolean
}>();

const emits = defineEmits<{
  (e: 'update:open', value: boolean): void
}>();

const key = ref<string | null>(null)

const open = ref<boolean>(props.open)
watch(open, async () => {
	emits('update:open', open.value)
	if (!open.value) {
		key.value = null
	}
})


async function copyPrivateKey() {
  try {
    if (!key.value) {
      toast.error('Unexpected error');
      return;
    }
    await navigator.clipboard.writeText(key.value);
    toast.success('Private key copied to clipboard!');
  } catch (error) {
    toast.error('Failed to copy the key');
  }
}
</script>

<template>
  <AlertDialogRoot v-model:open="open">
    <AlertDialogPortal>
      <AlertDialogOverlay class="fixed inset-0 bg-black/30 backdrop-blur-sm z-40" />
      <AlertDialogContent
        class="z-[100] border text-sm data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[90vw] max-w-[500px] translate-x-[-50%] translate-y-[-50%] rounded-lg bg-card p-[25px] shadow-[hsl(206_22%_7%_/_35%)_0px_10px_38px_-10px,_hsl(206_22%_7%_/_20%)_0px_10px_20px_-15px] focus:outline-none"
      >
        <AlertDialogTitle class="text-mauve12 m-0 text-[17px] font-semibold">
          Access to Private Token
        </AlertDialogTitle>
        <AlertDialogDescription class="text-mauve11 mt-4 mb-5 text-sm leading-normal">
          Your private token grants <b>full access</b> to your account and all associated data. <br/>Never share this token with anyone and <b>do not store</b> it in public places (such as screenshots, chats, or repositories).
        </AlertDialogDescription>
        <AlertDialogDescription class="text-mauve11 mt-4 mb-5 text-sm leading-normal break-words">
          <template v-if="key">
            {{ key }}
            <Button
              class="border bg-card ml-4 w-[36px] h-[36px] cursor-pointer"
              @click="copyPrivateKey()"
            >
              <Copy :size="16" color="#fff" />
            </Button>
          </template>
          <template v-else>**************</template>
        </AlertDialogDescription>
        <div
          v-if="key"
          class="flex justify-end gap-4"
        >
          <AlertDialogCancel
            class="cursor-pointer text-mauve11 bg-mauve4 hover:bg-mauve5 focus:shadow-mauve7 inline-flex h-[35px] items-center justify-center rounded-md px-[15px] font-semibold leading-none outline-none focus:shadow-[0_0_0_2px]"
          >
            Close
          </AlertDialogCancel>
        </div>
        <div
          v-else
          class="flex justify-end gap-4"
        >
          <AlertDialogCancel
            class="cursor-pointer text-mauve11 trx bg-mauve4 hover:bg-mauve5 focus:shadow-mauve7 inline-flex h-[35px] items-center justify-center rounded-md px-[15px] font-semibold leading-none outline-none focus:shadow-[0_0_0_2px]"
          >
            Cancel
          </AlertDialogCancel>
          <Button class="text-red-500 cursor-pointer" @click="showToken()">I Understand, Show Token</Button>
        </div>
      </AlertDialogContent>
    </AlertDialogPortal>
  </AlertDialogRoot>
</template>
