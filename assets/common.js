document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('page-enter');
});

window.addEventListener('pageshow', () => {
  document.body.classList.remove('page-exit');
  document.body.classList.add('page-enter');
});

function shouldUseTransition(link) {
    if (!link) return false;

    const href = link.getAttribute("href");
    if (!href) return false;

    // Don't animate same-page anchor links
    if (href.startsWith("#")) return false;

    // Ignore downloads, new tabs and special links
    if (
        link.hasAttribute("download") ||
        link.target === "_blank" ||
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("data:")
    ) {
        return false;
    }

    // External websites
    if (href.startsWith("http://") || href.startsWith("https://")) {
        return new URL(href).origin === window.location.origin;
    }

    return true;
}

function navigateWithTransition(url, delay = 250) {
  if (document.body.classList.contains('page-exit')) {
    return;
  }

  document.body.classList.remove('page-enter');
  document.body.classList.add('page-exit');

  window.setTimeout(() => {
    window.location.assign(url);
  }, delay);
}

document.addEventListener('click', (event) => {
  const target = event.target;
  const link = target && typeof target.closest === 'function' ? target.closest('a') : null;

  if (!link || !shouldUseTransition(link)) {
    return;
  }

  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const targetUrl = new URL(link.getAttribute('href'), window.location.href);
  const currentUrl = new URL(window.location.href);

  if (targetUrl.origin === currentUrl.origin && targetUrl.pathname === currentUrl.pathname && targetUrl.search === currentUrl.search && targetUrl.hash === currentUrl.hash) {
    return;
  }

  event.preventDefault();
  navigateWithTransition(targetUrl.toString());
});
