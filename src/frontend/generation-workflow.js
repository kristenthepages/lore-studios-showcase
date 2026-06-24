// Sanitized excerpt from the Lore Studios frontend.
// Coordinates concurrent image generation, polling, retries,
// partial-result rendering, and progress updates.

const delay = milliseconds =>
  new Promise(resolve => setTimeout(resolve, milliseconds));

async function runImageJob(prompt, authHeaders, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const submission = await fetch("/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
      },
      body: JSON.stringify({ prompt }),
    });

    if (submission.status === 403) {
      const error = new Error("Generation limit reached");
      error.limitReached = true;
      throw error;
    }

    if (!submission.ok) {
      throw new Error(`Generation submission failed: ${submission.status}`);
    }

    const { requestId, error } = await submission.json();

    if (error || !requestId) {
      throw new Error(error || "No generation request ID returned");
    }

    for (let poll = 0; poll < 80; poll += 1) {
      await delay(3000);

      const response = await fetch(`/status/${requestId}`, {
        headers: authHeaders,
      });

      if (!response.ok) {
        throw new Error(`Status request failed: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === "COMPLETED" && result.url) {
        return result.url;
      }

      if (result.status === "FAILED") {
        break;
      }
    }
  }

  throw new Error("Generation failed after multiple attempts");
}

/**
 * Generates multiple scenes concurrently.
 *
 * UI behavior is supplied through callbacks so this showcase excerpt
 * remains independent of the production page structure.
 */
export async function generateArtwork({
  scenes,
  authHeaders,
  bookTitle,
  onStart,
  onImageComplete,
  onImageFailed,
  onProgress,
  onLimitReached,
  onFinish,
  saveGeneration,
}) {
  onStart?.(scenes.length);

  let completed = 0;
  let limitReached = false;

  await Promise.allSettled(
    scenes.map(async (scene, index) => {
      // Stagger submissions slightly instead of sending them simultaneously.
      await delay(index * 600);

      try {
        const imageUrl = await runImageJob(
          scene.prompt,
          authHeaders,
        );

        const result = {
          url: imageUrl,
          label: scene.label || `Scene ${index + 1}`,
        };

        onImageComplete?.(index, result);

        await saveGeneration?.({
          ...result,
          type: "image",
          bookTitle,
        });
      } catch (error) {
        if (error.limitReached) {
          limitReached = true;
        }

        onImageFailed?.(index, error);
      } finally {
        completed += 1;
        onProgress?.(completed, scenes.length);
      }
    }),
  );

  if (limitReached) {
    onLimitReached?.();
  }

  onFinish?.();
}
