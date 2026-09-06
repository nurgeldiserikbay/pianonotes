import { ref, watch, type Ref } from 'vue'

// Artwork that may or may not exist yet.
//
// The visual side of this game is produced outside the codebase: a pose of the
// mascot, a painted chapter cover, the wordmark. The code cannot wait for any of
// it, and it must never break because a file has not arrived — so every drawn
// asset is a *slot*: a path that is used if the browser can load it, and a
// code-drawn fallback if it cannot.
//
// That makes the handoff one-directional and safe. Drop a PNG into public/ with
// the agreed name and it appears on the next reload; delete it and the drawn
// version comes back. No imports to add, no component to edit, nothing to
// rebuild but the bundle.
//
// The failures are remembered for the session: a missing cover would otherwise
// re-request on every re-render of a list that shows thirty of them.
const missing = new Set<string>()

export interface DropInArt {
	// The file to try, or null once it is known to be absent.
	src: Ref<string | null>
	// Whether the caller should draw its own fallback instead.
	useFallback: Ref<boolean>
	// Bind to the <img>'s error event.
	onError: () => void
}

export function useDropInArt(path: Ref<string> | (() => string)): DropInArt {
	const resolve = typeof path === 'function' ? path : () => path.value

	const src = ref<string | null>(missing.has(resolve()) ? null : resolve())
	const useFallback = ref(src.value === null)

	function onError() {
		missing.add(resolve())
		src.value = null
		useFallback.value = true
	}

	// A component can change which asset it wants (a different mood, a different
	// pose) without being torn down, so the slot has to follow it.
	watch(
		() => resolve(),
		(next) => {
			if (missing.has(next)) {
				src.value = null
				useFallback.value = true
				return
			}
			src.value = next
			useFallback.value = false
		}
	)

	return { src, useFallback, onError }
}
