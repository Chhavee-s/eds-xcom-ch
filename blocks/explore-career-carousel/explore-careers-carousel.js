import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * Explore Careers Carousel – Modular
 *
 * Authoring (block table):
 *   Row 1 (optional, 1 cell):  section heading, e.g. "Where an NASM-CPT can take you."
 *   Row 2..n (4 cells):        Image | Title | Salary | Description
 *   (Also accepts 2 cells:     Image | Heading + salary paragraph + description paragraphs)
 */

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

function buildMedia(cell) {
  const img = cell?.querySelector('img');
  if (!img) return null;
  const media = el('div', 'ecc-card-media');
  media.append(createOptimizedPicture(img.src, img.alt || '', false, [
    { media: '(min-width: 900px)', width: '600' },
    { width: '480' },
  ]));
  return media;
}

function buildBody(cells) {
  const body = el('div', 'ecc-card-body');
  const title = el('h3', 'ecc-card-title');
  const salary = el('p', 'ecc-card-salary');
  const desc = el('div', 'ecc-card-desc');

  if (cells.length >= 4) {
    const [titleCell, salaryCell, descCell] = cells;
    title.textContent = titleCell.textContent.trim();
    salary.textContent = salaryCell.textContent.trim();
    if (descCell.querySelector('p')) desc.append(...descCell.children);
    else {
      const p = el('p');
      p.textContent = descCell.textContent.trim();
      desc.append(p);
    }
  } else if (cells[0]) {
    // 2-column fallback: heading, then salary paragraph, then description
    const cell = cells[0];
    const heading = cell.querySelector('h1, h2, h3, h4, h5, h6');
    title.textContent = heading ? heading.textContent.trim() : '';
    heading?.remove();
    const paras = [...cell.querySelectorAll('p')];
    const salaryP = paras.shift();
    salary.textContent = salaryP ? salaryP.textContent.trim() : '';
    desc.append(...paras);
  }

  if (title.textContent) body.append(title);
  if (salary.textContent) body.append(salary);
  if (desc.childElementCount) body.append(desc);
  return body;
}

function buildCard(row) {
  const cells = [...row.children];
  const li = el('li', 'ecc-card');
  const media = buildMedia(cells[0]);
  if (media) li.append(media);
  li.append(buildBody(cells.slice(1)));
  return li;
}

function setupNav(block, track, cards) {
  const nav = el('div', 'ecc-nav');
  const prev = el('button', 'ecc-arrow ecc-prev', { type: 'button', 'aria-label': 'Previous cards' });
  const next = el('button', 'ecc-arrow ecc-next', { type: 'button', 'aria-label': 'Next cards' });
  const dots = el('div', 'ecc-dots', { role: 'group', 'aria-label': 'Choose slide' });
  nav.append(prev, dots, next);
  block.append(nav);

  let pageSize = 0;
  let pageCount = 1;

  const metrics = () => {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    const cardW = cards[0].getBoundingClientRect().width + gap;
    const perView = Math.max(1, Math.floor((track.clientWidth + gap) / cardW));
    return { cardW, perView };
  };

  const activeIndex = () => {
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 2) return pageCount - 1;
    return Math.min(pageCount - 1, Math.round(track.scrollLeft / pageSize));
  };

  const update = () => {
    const current = activeIndex();
    [...dots.children].forEach((dot, i) => {
      dot.classList.toggle('active', i === current);
      if (i === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
  };

  const goTo = (page) => {
    track.scrollTo({ left: page * pageSize, behavior: 'smooth' });
  };

  const rebuild = () => {
    const { cardW, perView } = metrics();
    pageSize = cardW * perView;
    pageCount = Math.max(1, Math.ceil(cards.length / perView));
    dots.replaceChildren();
    for (let i = 0; i < pageCount; i += 1) {
      const dot = el('button', 'ecc-dot', { type: 'button', 'aria-label': `Go to slide ${i + 1} of ${pageCount}` });
      dot.addEventListener('click', () => goTo(i));
      dots.append(dot);
    }
    nav.hidden = pageCount <= 1 && track.scrollWidth <= track.clientWidth + 2;
    update();
  };

  prev.addEventListener('click', () => track.scrollBy({ left: -pageSize, behavior: 'smooth' }));
  next.addEventListener('click', () => track.scrollBy({ left: pageSize, behavior: 'smooth' }));

  let ticking = false;
  track.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => { update(); ticking = false; });
  }, { passive: true });

  new ResizeObserver(rebuild).observe(track);
  rebuild();
}

export default function decorate(block) {
  const rows = [...block.children];
  let headingText = '';

  // Optional heading row: single cell, no image
  if (rows[0] && rows[0].children.length === 1 && !rows[0].querySelector('img')) {
    headingText = rows.shift().textContent.trim();
  }

  const track = el('ul', 'ecc-track', { tabindex: '0' });
  const cards = rows.map(buildCard);
  track.append(...cards);

  block.replaceChildren();
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');

  if (headingText) {
    const id = `ecc-heading-${Math.random().toString(36).slice(2, 8)}`;
    const h2 = el('h2', 'ecc-heading', { id });
    h2.textContent = headingText;
    block.append(h2);
    block.setAttribute('aria-labelledby', id);
  } else {
    block.setAttribute('aria-label', 'Explore careers');
  }

  block.append(track);
  if (cards.length) setupNav(block, track, cards);
}
