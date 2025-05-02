import { ref, computed } from 'vue'
import type { Component } from 'vue'
import { defineStore } from 'pinia'

import { TYPE_PAGES } from '@/utils/types'

import { PAGES } from '@/utils/conts'

import StartPage from '@/pages/StartPage.vue'

export const usePageStore = defineStore('PageStore', () => {
	const currentPage = ref<TYPE_PAGES>(PAGES.START)

	const pages: { [key in TYPE_PAGES]: Component } = {
		START: StartPage,
	}

	const currentPageComponent = computed(() => {
		return pages[currentPage.value]
	})

	const backLink = computed(() => {
		return PAGES.START
	})

	function routeTo(page: TYPE_PAGES) {
		currentPage.value = page
	}

	function toBackLink() {
		if (backLink.value) routeTo(backLink.value)
	}

	return {
		currentPage,
		currentPageComponent,
		routeTo,
		backLink,
		toBackLink,
	}
})
