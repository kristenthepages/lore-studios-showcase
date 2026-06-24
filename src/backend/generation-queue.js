// Sanitized excerpt from the Lore Studios Express backend.
// Submits image-generation jobs and exposes a polling endpoint.

const FAL_API_KEY = process.env.FAL_API_KEY;

const SUBMIT_URL =
  "https://queue.fal.run/fal-ai/flux-pro/v1.1-ultra";

const STATUS_BASE_URL =
  "https://queue.fal.run/fal-ai/flux-pro/requests";

async function submitImageJob(prompt) {
  const response = await fetch(SUBMIT_URL, {
    method: "POST",
    headers: {
      Authorization: `Key ${FAL_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt,
      aspect_ratio: "9:16",
      num_images: 1,
      output_format: "jpeg",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(
      `Generation provider returned ${response.status}: ${details}`,
    );
  }

  const result = await response.json();

  if (!result.request_id) {
    throw new Error("Generation provider returned no request ID");
  }

  return result.request_id;
}

async function getImageJobStatus(requestId) {
  const statusResponse = await fetch(
    `${STATUS_BASE_URL}/${requestId}/status`,
    {
      headers: {
        Authorization: `Key ${FAL_API_KEY}`,
      },
    },
  );

  if (!statusResponse.ok) {
    throw new Error(
      `Status request failed: ${statusResponse.status}`,
    );
  }

  const statusResult = await statusResponse.json();

  if (statusResult.status !== "COMPLETED") {
    return {
      status: statusResult.status || "IN_QUEUE",
    };
  }

  const resultResponse = await fetch(
    `${STATUS_BASE_URL}/${requestId}`,
    {
      headers: {
        Authorization: `Key ${FAL_API_KEY}`,
      },
    },
  );

  if (!resultResponse.ok) {
    throw new Error(
      `Result request failed: ${resultResponse.status}`,
    );
  }

  const result = await resultResponse.json();
  const images = result.images || result.output?.images;
  const filtered =
    result.has_nsfw_concepts ||
    result.output?.has_nsfw_concepts;

  if (Array.isArray(filtered) && filtered[0] === true) {
    return {
      status: "FAILED",
      error: "Generated image was filtered",
    };
  }

  if (!images?.[0]?.url) {
    return {
      status: "FAILED",
      error: "No image was returned",
    };
  }

  return {
    status: "COMPLETED",
    url: images[0].url,
  };
}

/**
 * Adds generation routes to an Express application.
 * `requireAuth` is injected from auth-middleware.js.
 */
export function registerGenerationRoutes(app, requireAuth) {
  app.post("/generate", requireAuth, async (req, res) => {
    const prompt = req.body?.prompt?.trim();

    if (!prompt) {
      return res.status(400).json({
        error: "A generation prompt is required",
      });
    }

    try {
      const requestId = await submitImageJob(prompt);
      return res.json({ requestId });
    } catch (error) {
      console.error("Generation submission failed:", error);

      return res.status(502).json({
        error: "Unable to submit generation",
      });
    }
  });

  app.get(
    "/status/:requestId",
    requireAuth,
    async (req, res) => {
      const { requestId } = req.params;

      // Prevent arbitrary values from being inserted into provider URLs.
      if (!/^[a-zA-Z0-9_-]+$/.test(requestId)) {
        return res.status(400).json({
          error: "Invalid request ID",
        });
      }

      try {
        const result = await getImageJobStatus(requestId);
        return res.json(result);
      } catch (error) {
        console.error("Generation status check failed:", error);

        return res.status(502).json({
          error: "Unable to retrieve generation status",
        });
      }
    },
  );
}
