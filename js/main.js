
async function loadComponent(selector, file) {
    try {
        const root = document.querySelector(selector);
        if (!root) return;

        const response = await fetch(file);
        if (!response.ok) throw new Error("Failed to load component");
        const content = await response.text();
        root.innerHTML = content;
        
        const isIndexPage = (() => {
            const path = window.location.pathname;
            return path.endsWith("/") || path.endsWith("\\") || path.endsWith("/index.html") || path.endsWith("\\index.html") || path.endsWith("index.html");
        })();

        // 인덱스에서는 해시 링크로 보정(새로고침/리로드 방지)
        if (selector === '.site-header' && isIndexPage) {
            const headerRoot = document.querySelector('.site-header');
            if (headerRoot) {
                const brand = headerRoot.querySelector('.brand');
                if (brand) brand.setAttribute('href', '#main');

                headerRoot.querySelectorAll('.nav__link').forEach((a) => {
                    const href = a.getAttribute('href') || '';
                    const hashIndex = href.indexOf('#');
                    if (hashIndex >= 0) a.setAttribute('href', href.slice(hashIndex));
                });
            }
        }

        // 푸터 연도 자동 업데이트 + 인덱스용 링크/라벨 보정
        if (selector === '.site-footer') {
            const yearSpan = document.querySelector('.footer__year');
            if (yearSpan) yearSpan.textContent = new Date().getFullYear();

            if (isIndexPage) {
                const footerLink = document.querySelector('.footer__link');
                if (footerLink) {
                    footerLink.setAttribute('href', '#main');
                    footerLink.textContent = 'Back to top';
                }
            }
        }
    } catch (error) {
        console.error(`Error loading ${file}:`, error);
    }
}

function initHeroSlider() {
  const root = document.querySelector("[data-hero-slider]");
  if (!root) return;

  const track = root.querySelector("[data-hero-track]");
  const prevBtn = root.querySelector("[data-hero-prev]");
  const nextBtn = root.querySelector("[data-hero-next]");
  const pauseBtn = root.querySelector("[data-hero-pause]");
  const pauseLabel = root.querySelector("[data-hero-pause-label]");
  const live = root.querySelector("[data-hero-live]");
  const dotButtons = Array.from(root.querySelectorAll("[data-hero-dot]"));

  if (!track || !prevBtn || !nextBtn || !pauseBtn || !pauseLabel || !live) return;

  const slides = Array.from(track.querySelectorAll(".hero-slide"));
  if (slides.length === 0) return;

  const prefersReducedMotion = window.matchMedia?.(
    "(prefers-reduced-motion: reduce)"
  )?.matches;

  const heroBackgrounds = ["#DDEAD9", "#E5EEF4", "#E8E0F7"];
  const heroSection =
    root.closest(".section--hero") || root.closest("section") || document.body;

  let index = 0;
  let isPaused = prefersReducedMotion ? true : false;
  let timerId = null;
  let startX = null;
  let startY = null;
  let isPointerDown = false;

  function updateHeroBackground() {
    const color = heroBackgrounds[index] || heroBackgrounds[0];
    if (!color) return;
    heroSection.style.setProperty("--hero-bg", color);
  }

  function clampIndex(i) {
    const n = slides.length;
    return ((i % n) + n) % n;
  }

  function updateTransform() {
    track.style.transform = `translateX(${-index * 100}%)`;
  }

  function updateDots() {
    if (!dotButtons.length) return;
    dotButtons.forEach((btn, i) => {
      const selected = i === index;
      btn.setAttribute("aria-selected", String(selected));
      btn.setAttribute("tabindex", selected ? "0" : "-1");
    });
  }

  function announce() {
    const total = slides.length;
    const label = slides[index]?.getAttribute("aria-label") || `Slide ${index + 1}`;
    live.textContent = `${index + 1} / ${total}. ${label}`;
  }

  function setPaused(nextPaused) {
    isPaused = nextPaused;
    pauseBtn.setAttribute("aria-pressed", String(isPaused));
    pauseLabel.textContent = isPaused ? "Play" : "Pause";

    if (isPaused) {
      stopAutoplay();
    } else {
      startAutoplay();
    }
  }

  function goTo(i, { userInitiated = false } = {}) {
    index = clampIndex(i);
    updateTransform();
    updateHeroBackground();
    updateDots();
    announce();
    if (userInitiated) setPaused(true);
  }

  function next(opts) {
    goTo(index + 1, opts);
  }

  function prev(opts) {
    goTo(index - 1, opts);
  }

  function startAutoplay() {
    if (prefersReducedMotion) return;
    stopAutoplay();
    timerId = window.setInterval(() => {
      if (!isPaused) next({ userInitiated: false });
    }, 3000);
  }

  function stopAutoplay() {
    if (timerId) {
      window.clearInterval(timerId);
      timerId = null;
    }
  }

  prevBtn.addEventListener("click", () => prev({ userInitiated: true }));
  nextBtn.addEventListener("click", () => next({ userInitiated: true }));

  pauseBtn.addEventListener("click", () => {
    setPaused(!isPaused);
  });

  dotButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const raw = btn.getAttribute("data-hero-dot");
      const i = raw ? Number(raw) : NaN;
      if (!Number.isFinite(i)) return;
      goTo(i, { userInitiated: true });
    });
  });

  // Pause autoplay when the user interacts with the carousel region
  root.addEventListener("pointerdown", () => setPaused(true));
  root.addEventListener("focusin", () => setPaused(true));

  // Touch / pointer swipe (mobile)
  root.addEventListener("pointerdown", (e) => {
    if (!(e instanceof PointerEvent)) return;
    if (e.pointerType === "mouse") return;
    isPointerDown = true;
    startX = e.clientX;
    startY = e.clientY;
  });

  root.addEventListener("pointerup", (e) => {
    if (!(e instanceof PointerEvent)) return;
    if (!isPointerDown || startX === null || startY === null) return;
    isPointerDown = false;

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = null;
    startY = null;

    // ignore mostly-vertical gestures
    if (Math.abs(dy) > Math.abs(dx)) return;

    const threshold = 40;
    if (dx <= -threshold) next({ userInitiated: true });
    if (dx >= threshold) prev({ userInitiated: true });
  });

  // Keyboard controls when focus is within the carousel
  root.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      prev({ userInitiated: true });
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      next({ userInitiated: true });
    }
  });

  // Close mobile menu after clicking a nav link
  document.addEventListener("click", (e) => {
    const a = e.target instanceof Element ? e.target.closest(".nav__link") : null;
    const toggle = document.getElementById("nav-toggle");
    if (a && toggle instanceof HTMLInputElement) toggle.checked = false;
  });

  // Init
  updateTransform();
  updateHeroBackground();
  updateDots();
  announce();
  setPaused(isPaused);
}

function initWorkFilters() {
  const root = document.querySelector(".work-filters");
  const grid = document.querySelector(".work-grid");
  if (!root || !grid) return;

  const buttons = Array.from(root.querySelectorAll("[data-work-filter]")).filter(
    (el) => el instanceof HTMLButtonElement
  );
  if (!buttons.length) return;

  const selected = new Set();

  function getCardCategorySet(card) {
    const set = new Set();
    card.classList.forEach((c) => {
      if (c.startsWith("project-card--")) set.add(c.replace("project-card--", ""));
    });
    return set;
  }

  function syncButtons() {
    buttons.forEach((btn) => {
      const key = btn.getAttribute("data-work-filter") || "";
      const on = key === "all" ? selected.size === 0 : selected.has(key);
      btn.setAttribute("aria-pressed", String(on));
    });
  }

  function apply() {
    const cards = Array.from(grid.querySelectorAll("a.project-card"));
    cards.forEach((card) => {
      if (!(card instanceof HTMLElement)) return;

      if (selected.size === 0) {
        card.style.display = "";
        return;
      }

      const categories = getCardCategorySet(card);
      const match = Array.from(selected).some((k) => categories.has(k));
      card.style.display = match ? "" : "none";
    });
  }

  root.addEventListener("click", (e) => {
    const btn =
      e.target instanceof Element ? e.target.closest("[data-work-filter]") : null;
    if (!(btn instanceof HTMLButtonElement)) return;
    const key = btn.getAttribute("data-work-filter");
    if (!key) return;

    if (key === "all") {
      selected.clear();
    } else {
      // single-select: clicking one chip turns off others
      selected.clear();
      selected.add(key);
    }

    syncButtons();
    apply();
  });

  // initial state = All
  selected.clear();
  syncButtons();
  apply();
}

// 페이지 로드 시 실행
document.addEventListener("DOMContentLoaded", async () => {
    loadComponent(".site-header", "components/header.html");
    loadComponent(".site-footer", "components/footer.html");
    loadComponent(".other-works-mount", "components/other-works.html");

    const isIndexPage = (() => {
        const path = window.location.pathname;
        return (
            path.endsWith("/") ||
            path.endsWith("\\") ||
            path.endsWith("/index.html") ||
            path.endsWith("\\index.html") ||
            path.endsWith("index.html")
        );
    })();

    const CACHE_BUST = "20260410c";
    const htmlCache = new Map();

    function withCacheBust(url) {
        try {
            const u = new URL(url);
            u.searchParams.set("v", CACHE_BUST);
            return u.toString();
        } catch {
            const joiner = url.includes("?") ? "&" : "?";
            return `${url}${joiner}v=${encodeURIComponent(CACHE_BUST)}`;
        }
    }

    async function fetchHtml(url) {
        if (htmlCache.has(url)) return htmlCache.get(url);
        const res = await fetch(withCacheBust(url), { cache: "no-store" });
        if (!res.ok) throw new Error(`Failed to load ${url}`);
        const text = await res.text();
        htmlCache.set(url, text);
        return text;
    }

    function parseProjectPageForHero(htmlText, baseUrl) {
        const doc = new DOMParser().parseFromString(htmlText, "text/html");
        const label =
            doc.querySelector(".section-head__label")?.textContent?.trim() ?? "";
        const title =
            doc.querySelector(".section-head__title")?.textContent?.trim() ?? "";
        const subtitle =
            doc.querySelector(".section-head__subtitle")?.textContent?.trim() ?? "";
        const imgEl = doc.querySelector(
            "main img.article__cover[src], main img[src]"
        );
        const rawSrc = imgEl?.getAttribute("src");
        let imageSrc = null;
        if (rawSrc) {
            try {
                imageSrc = new URL(rawSrc, baseUrl).toString();
            } catch {
                imageSrc = null;
            }
        }
        return { label, title, subtitle, imageSrc };
    }

    async function hydrateHeroSlidesFromSelectedProjects() {
        if (!isIndexPage) return;

        const cards = Array.from(
            document.querySelectorAll(".work-grid a.project-card[href]")
        ).slice(0, 3);
        const slides = Array.from(
            document.querySelectorAll("[data-hero-track] .hero-slide")
        );
        const n = Math.min(cards.length, slides.length, 3);
        if (!n) return;

        await Promise.all(
            Array.from({ length: n }, async (_, i) => {
                const card = cards[i];
                const slide = slides[i];
                const href = card.getAttribute("href");
                if (!href || !slide) return;

                let pageUrl;
                try {
                    pageUrl = new URL(href, window.location.href).toString();
                } catch {
                    return;
                }

                const cardTitle =
                    card.querySelector(".project-card__title")?.textContent?.trim() ??
                    "";
                const cardCategory =
                    card.querySelector(".project-card__category")?.textContent?.trim() ??
                    "";
                const cardDesc =
                    card.querySelector(".project-card__desc")?.textContent?.trim() ??
                    "";

                try {
                    const htmlText = await fetchHtml(pageUrl);
                    const parsed = parseProjectPageForHero(htmlText, pageUrl);

                    const titleText = parsed.title || cardTitle;
                    const metaText = parsed.label || cardCategory;
                    const subText = parsed.subtitle || cardDesc;

                    slide.setAttribute("href", href);
                    slide.setAttribute(
                        "aria-label",
                        `새 탭에서 프로젝트 열기: ${titleText}`
                    );

                    const metaEl = slide.querySelector(".hero-slide__meta");
                    const titleEl = slide.querySelector(".hero-slide__title");
                    const subEl = slide.querySelector(".hero-slide__subtext");
                    const imgEl = slide.querySelector(".hero-slide__img");

                    if (metaEl) metaEl.textContent = metaText;
                    if (titleEl) titleEl.textContent = titleText;
                    if (subEl) subEl.textContent = subText;
                    if (imgEl instanceof HTMLImageElement && parsed.imageSrc) {
                        imgEl.src = parsed.imageSrc;
                        imgEl.loading = i === 0 ? "eager" : "lazy";
                    }
                } catch (e) {
                    console.warn("Hero hydrate failed:", pageUrl, e);
                }
            })
        );
    }

    async function hydrateProjectCardTitlesFromProjectPages() {
        if (!isIndexPage) return;

        const cards = Array.from(
            document.querySelectorAll(".work-grid a.project-card[href]")
        );
        if (!cards.length) return;

        await Promise.all(
            cards.map(async (card) => {
                const href = card.getAttribute("href");
                if (!href) return;

                let pageUrl;
                try {
                    pageUrl = new URL(href, window.location.href).toString();
                } catch {
                    return;
                }

                const titleEl = card.querySelector(".project-card__title");
                const fallbackTitle = titleEl?.textContent?.trim() ?? "";

                try {
                    const htmlText = await fetchHtml(pageUrl);
                    const parsed = parseProjectPageForHero(htmlText, pageUrl);
                    const titleText = parsed.title || fallbackTitle;
                    if (!titleText) return;

                    if (titleEl) titleEl.textContent = titleText;
                    card.setAttribute("aria-label", `새 탭에서 프로젝트 열기: ${titleText}`);
                } catch (e) {
                    console.warn("Card title hydrate failed:", pageUrl, e);
                }
            })
        );
    }

    async function hydrateProjectCardDescsFromProjectPages() {
        if (!isIndexPage) return;

        const cards = Array.from(
            document.querySelectorAll(".work-grid a.project-card[href]")
        );
        if (!cards.length) return;

        await Promise.all(
            cards.map(async (card) => {
                const href = card.getAttribute("href");
                if (!href) return;

                let pageUrl;
                try {
                    pageUrl = new URL(href, window.location.href).toString();
                } catch {
                    return;
                }

                const descEl = card.querySelector(".project-card__desc");
                const fallbackDesc = descEl?.textContent?.trim() ?? "";

                try {
                    const htmlText = await fetchHtml(pageUrl);
                    const parsed = parseProjectPageForHero(htmlText, pageUrl);
                    const descText = parsed.subtitle || fallbackDesc;
                    if (!descText) return;
                    if (descEl) descEl.textContent = descText;
                } catch (e) {
                    console.warn("Card desc hydrate failed:", pageUrl, e);
                }
            })
        );
    }

    async function hydrateSelectedProjectThumbnails() {
        if (!isIndexPage) return;

        const cards = Array.from(
            document.querySelectorAll(".work-grid a.project-card[href]")
        );
        if (!cards.length) return;

        function getFirstImageSrc(htmlText, baseUrl) {
            const doc = new DOMParser().parseFromString(htmlText, "text/html");
            const img = doc.querySelector(
                "main img.article__cover[src], main img[src]"
            );
            const rawSrc = img?.getAttribute("src");
            if (!rawSrc) return null;
            try {
                return new URL(rawSrc, baseUrl).toString();
            } catch {
                return null;
            }
        }

        await Promise.all(
            cards.map(async (card) => {
                const thumb = card.querySelector(".project-card__thumb");
                if (!thumb) return;
                if (thumb.querySelector("img")) return;

                const href = card.getAttribute("href");
                if (!href) return;

                let pageUrl;
                try {
                    pageUrl = new URL(href, window.location.href).toString();
                } catch {
                    return;
                }

                try {
                    const htmlText = await fetchHtml(pageUrl);
                    const imageSrc = getFirstImageSrc(htmlText, pageUrl);
                    if (!imageSrc) return;

                    const img = document.createElement("img");
                    img.src = imageSrc;
                    img.alt = "";
                    img.loading = "lazy";
                    img.decoding = "async";
                    thumb.appendChild(img);
                } catch (e) {
                    console.warn("Thumbnail hydrate failed:", pageUrl, e);
                }
            })
        );
    }

    await hydrateHeroSlidesFromSelectedProjects();
    await hydrateProjectCardTitlesFromProjectPages();
    await hydrateProjectCardDescsFromProjectPages();
    await hydrateSelectedProjectThumbnails();

    initLightbox();
    initWorkFilters();
    initHeroSlider();

    function initLightbox() {
        const root = document.createElement("div");
        root.className = "lightbox";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.setAttribute("aria-label", "Image preview");
        root.hidden = true;

        root.innerHTML = `
          <button class="lightbox__close" type="button" aria-label="Close">×</button>
          <div class="lightbox__backdrop" data-lightbox-backdrop></div>
          <img class="lightbox__img" alt="" />
        `;

        document.body.appendChild(root);

        const imgEl = root.querySelector(".lightbox__img");
        const closeBtn = root.querySelector(".lightbox__close");
        const backdrop = root.querySelector("[data-lightbox-backdrop]");

        function open(src) {
            if (!(imgEl instanceof HTMLImageElement)) return;
            imgEl.src = src;
            root.hidden = false;
            document.documentElement.classList.add("is-lightbox-open");
            closeBtn?.focus?.();
        }

        function close() {
            if (!(imgEl instanceof HTMLImageElement)) return;
            root.hidden = true;
            imgEl.removeAttribute("src");
            document.documentElement.classList.remove("is-lightbox-open");
        }

        closeBtn?.addEventListener("click", close);
        backdrop?.addEventListener("click", close);
        root.addEventListener("click", (e) => {
            // safety: clicking around the image closes
            if (e.target === root) close();
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && !root.hidden) close();
        });

        // Enable click-to-zoom for content images only
        document.addEventListener("click", (e) => {
            const img = e.target instanceof Element ? e.target.closest("main img") : null;
            if (!(img instanceof HTMLImageElement)) return;
            if (img.closest("[data-hero-slider]")) return;
            // 홈 포트폴리오(Work) 카드 썸네일은 새 탭 이동이 목적이므로 확대 제외
            if (img.closest(".work-grid a.project-card")) return;
            const src = img.currentSrc || img.src;
            if (!src) return;
            open(src);
        });
    }
});
