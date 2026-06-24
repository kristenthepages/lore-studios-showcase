// Sanitized excerpt from Lore Studios.
// Provides debounced book search with safe DOM rendering.

let debounceTimer;
let currentResults = [];

export function initializeBookAutocomplete({
  input,
  dropdown,
  authorInput,
  getAuthHeaders,
}) {
  input.addEventListener("input", () => {
    clearTimeout(debounceTimer);

    const query = input.value.trim();

    if (query.length < 2) {
      hideDropdown(dropdown);
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const headers = await getAuthHeaders();

        const response = await fetch(
          `/book-search?q=${encodeURIComponent(query)}`,
          { headers },
        );

        if (!response.ok) {
          throw new Error(`Book search failed: ${response.status}`);
        }

        const { books = [] } = await response.json();
        currentResults = books.slice(0, 6);

        renderResults({
          books: currentResults,
          dropdown,
          input,
          authorInput,
        });
      } catch (error) {
        console.error("Book autocomplete failed:", error);
        hideDropdown(dropdown);
      }
    }, 300);
  });

  document.addEventListener("click", event => {
    if (!event.target.closest("[data-book-search]")) {
      hideDropdown(dropdown);
    }
  });
}

function renderResults({
  books,
  dropdown,
  input,
  authorInput,
}) {
  dropdown.replaceChildren();

  if (!books.length) {
    hideDropdown(dropdown);
    return;
  }

  books.forEach(book => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "autocomplete-result";

    const title = document.createElement("span");
    title.className = "autocomplete-title";
    title.textContent = book.title;

    const author = document.createElement("span");
    author.className = "autocomplete-author";
    author.textContent = book.author || "Unknown author";

    button.append(title, author);

    button.addEventListener("click", () => {
      input.value = book.title;

      if (authorInput) {
        authorInput.value = book.author || "";
      }

      hideDropdown(dropdown);
    });

    dropdown.appendChild(button);
  });

  dropdown.hidden = false;
}

function hideDropdown(dropdown) {
  dropdown.hidden = true;
  dropdown.replaceChildren();
}
