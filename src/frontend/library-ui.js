// Sanitized excerpt from Lore Studios.
// Loads, renders, downloads, and deletes authenticated user media.

export async function loadLibrary({
  container,
  getAuthHeaders,
  onError,
}) {
  container.replaceChildren(
    createMessage("Loading your library…"),
  );

  try {
    const headers = await getAuthHeaders();
    const response = await fetch("/library", { headers });

    if (!response.ok) {
      throw new Error(`Library request failed: ${response.status}`);
    }

    const { items = [] } = await response.json();
    renderLibrary(container, items, getAuthHeaders);
  } catch (error) {
    console.error("Unable to load library:", error);
    container.replaceChildren(
      createMessage("Unable to load your library."),
    );
    onError?.(error);
  }
}

function renderLibrary(container, items, getAuthHeaders) {
  container.replaceChildren();

  if (!items.length) {
    container.append(
      createMessage("No saved generations yet."),
    );
    return;
  }

  items.forEach(item => {
    const card = document.createElement("article");
    card.className = "library-item";

    const media =
      item.type === "video"
        ? document.createElement("video")
        : document.createElement("img");

    media.src = item.url;

    if (item.type === "video") {
      media.controls = true;
      media.muted = true;
      media.playsInline = true;
    } else {
      media.alt = item.label || item.book_title || "Generated artwork";
      media.loading = "lazy";
    }

    const label = document.createElement("p");
    label.textContent =
      item.label || item.book_title || "Untitled";

    const downloadButton = createButton("Download", () => {
      downloadAsset(item.url, item.type);
    });

    const deleteButton = createButton("Delete", async () => {
      const confirmed = window.confirm(
        "Delete this item from your library?",
      );

      if (!confirmed) return;

      try {
        const headers = await getAuthHeaders();

        const response = await fetch(`/library/${item.id}`, {
          method: "DELETE",
          headers,
        });

        if (!response.ok) {
          throw new Error(`Delete failed: ${response.status}`);
        }

        card.remove();

        if (!container.querySelector(".library-item")) {
          container.append(
            createMessage("No saved generations yet."),
          );
        }
      } catch (error) {
        console.error("Unable to delete library item:", error);
      }
    });

    card.append(media, label, downloadButton, deleteButton);
    container.append(card);
  });
}

async function downloadAsset(url, type) {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `lore-studios-${Date.now()}.${
      type === "video" ? "mp4" : "jpg"
    }`;

    link.click();
    URL.revokeObjectURL(objectUrl);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}

function createButton(label, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function createMessage(text) {
  const message = document.createElement("p");
  message.className = "library-message";
  message.textContent = text;
  return message;
}
