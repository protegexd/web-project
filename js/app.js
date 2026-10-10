'use strict';

/* ============================================================
   Точка и клик — интерактивный каталог квестов (ЛР2)
   Архитектура: State-Driven UI (UI = render(state))
   ============================================================ */

/* ---------- 1. Константы и справочные данные ---------- */

const STORAGE_KEY = 'quest-catalog-v1';

// Заглушки-картинки по жанрам — используем существующие SVG из ЛР1
const GENRE_IMAGES = {
  'детектив': 'assets/images/lighthouse.svg',
  'мистика': 'assets/images/tram.svg',
  'мистика и хоррор': 'assets/images/mansion.svg',
  'комедия': 'assets/images/cafe.svg',
  'научная фантастика': 'assets/images/station.svg',
  'фэнтези': 'assets/images/library.svg'
};

// Демо-данные (Default State) — используются, если localStorage пуст
const DEFAULT_ITEMS = [
  {
    id: 'seed-1',
    title: 'Пропавший маяк',
    description: 'Смотритель исчез в штормовую ночь. Восстановите картину событий по судовому журналу, письмам и следам на пристани.',
    genre: 'детектив',
    difficulty: 'средняя',
    year: 2021,
    hours: 6
  },
  {
    id: 'seed-2',
    title: 'Пиксельный особняк',
    description: 'Восемь комнат, один наследник и семейная тайна, которая не любит гостей. Классический хоррор с инвентарём и записками.',
    genre: 'мистика и хоррор',
    difficulty: 'высокая',
    year: 2019,
    hours: 9
  },
  {
    id: 'seed-3',
    title: 'Кофейня на Второй улице',
    description: 'Тёплая комедия о баристе, который пытается спасти кофейню и заодно разобраться в чужих историях за стойкой.',
    genre: 'комедия',
    difficulty: 'низкая',
    year: 2023,
    hours: 3
  },
  {
    id: 'seed-4',
    title: 'Станция «Юпитер-9»',
    description: 'Экипаж орбитальной станции не отвечает. Доберитесь до пульта управления и решите, кого спасать первым.',
    genre: 'научная фантастика',
    difficulty: 'средняя',
    year: 2022,
    hours: 7
  },
  {
    id: 'seed-5',
    title: 'Тайна старой библиотеки',
    description: 'Каталог перепутан, а за переставленными книгами спрятаны подсказки. Разгадайте шифр хранителя до закрытия читального зала.',
    genre: 'фэнтези',
    difficulty: 'средняя',
    year: 2018,
    hours: 5
  },
  {
    id: 'seed-6',
    title: 'Полночный трамвай',
    description: 'Последний трамвай едет по маршруту, которого нет на карте. Найдите способ сойти на своей остановке.',
    genre: 'мистика',
    difficulty: 'высокая',
    year: 2024,
    hours: 8
  }
];

/* ---------- 2. Состояние приложения (единый источник правды) ---------- */

const state = {
  items: [],
  searchQuery: '',
  selectedGenre: 'all',
  selectedDifficulty: 'all',
  sortBy: 'year-desc'
};

/* ---------- 3. Работа с localStorage ---------- */

function loadItemsFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch (error) {
    console.warn('Не удалось прочитать localStorage:', error);
    return null;
  }
}

function saveItemsToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
  } catch (error) {
    console.warn('Не удалось сохранить в localStorage:', error);
  }
}

/* ---------- 4. Ссылки на DOM-элементы ---------- */

const els = {
  cards: document.getElementById('cards'),
  emptyState: document.getElementById('empty-state'),
  catalogStatus: document.getElementById('catalog-status'),

  search: document.getElementById('search'),
  filterGenre: document.getElementById('filter-genre'),
  filterDifficulty: document.getElementById('filter-difficulty'),
  sort: document.getElementById('sort'),
  resetFilters: document.getElementById('reset-filters'),

  factsCount: document.getElementById('facts-count'),
  factsGenres: document.getElementById('facts-genres'),

  openModal: document.getElementById('open-modal'),
  closeModal: document.getElementById('close-modal'),
  cancelModal: document.getElementById('cancel-modal'),
  modal: document.getElementById('modal'),
  form: document.getElementById('quest-form')
};

/* ---------- 5. Утилиты ---------- */

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function normalizeText(value) {
  return String(value).toLowerCase().trim();
}

/* ---------- 6. Получение производных данных (compute) ---------- */

function getVisibleItems() {
  const query = normalizeText(state.searchQuery);
  let result = state.items;

  // Фильтр по жанру
  if (state.selectedGenre !== 'all') {
    result = result.filter((item) => item.genre === state.selectedGenre);
  }

  // Фильтр по сложности
  if (state.selectedDifficulty !== 'all') {
    result = result.filter((item) => item.difficulty === state.selectedDifficulty);
  }

  // Поиск по названию и описанию
  if (query !== '') {
    result = result.filter((item) => {
      const haystack = `${normalizeText(item.title)} ${normalizeText(item.description)}`;
      return haystack.includes(query);
    });
  }

  // Иммутабельная сортировка (копия через slice)
  const sorted = result.slice().sort((a, b) => {
    switch (state.sortBy) {
      case 'year-asc':   return a.year - b.year;
      case 'year-desc':  return b.year - a.year;
      case 'title-asc':  return a.title.localeCompare(b.title, 'ru');
      case 'title-desc': return b.title.localeCompare(a.title, 'ru');
      case 'hours-asc':  return a.hours - b.hours;
      case 'hours-desc': return b.hours - a.hours;
      default:           return 0;
    }
  });

  return sorted;
}

/* ---------- 7. Создание DOM-элементов (безопасно, через textContent) ---------- */

function createMetaRow(label, value) {
  const dt = document.createElement('dt');
  dt.textContent = label;

  const dd = document.createElement('dd');
  dd.textContent = value;

  return [dt, dd];
}

function createCard(item) {
  const article = document.createElement('article');
  article.className = 'card';
  article.dataset.id = item.id;

  // --- Картинка ---
  const figure = document.createElement('figure');
  figure.className = 'card__art';

  const imageSrc = GENRE_IMAGES[item.genre];
  if (imageSrc) {
    const img = document.createElement('img');
    img.src = imageSrc;
    img.alt = `Иллюстрация квеста «${item.title}»`;
    img.width = 320;
    img.height = 180;
    img.loading = 'lazy';
    figure.appendChild(img);
  } else {
    // Осмысленная заглушка, если жанр не из списка
    figure.classList.add('card__art--placeholder');
    figure.textContent = '🎮';
    figure.setAttribute('aria-label', 'Иллюстрация отсутствует');
  }

  // --- Тело карточки ---
  const body = document.createElement('div');
  body.className = 'card__body';

  const title = document.createElement('h3');
  title.className = 'card__title';
  title.textContent = item.title;

  const desc = document.createElement('p');
  desc.className = 'card__desc';
  desc.textContent = item.description;

  const meta = document.createElement('dl');
  meta.className = 'card__meta';

  meta.append(...createMetaRow('Жанр', item.genre));
  meta.append(...createMetaRow('Год выпуска', String(item.year)));
  meta.append(...createMetaRow('Сложность', item.difficulty));
  meta.append(...createMetaRow('Прохождение', `${item.hours} ч`));

  body.append(title, desc, meta);

  // --- Кнопка удаления ---
  const actions = document.createElement('div');
  actions.className = 'card__actions';

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'btn btn--danger';
  removeBtn.dataset.action = 'delete';
  removeBtn.textContent = 'Удалить';
  removeBtn.setAttribute('aria-label', `Удалить квест «${item.title}»`);

  actions.appendChild(removeBtn);

  article.append(figure, body, actions);
  return article;
}

/* ---------- 8. Отрисовка (UI = render(state)) ---------- */

function updateGenreOptions() {
  const currentValue = els.filterGenre.value;

  // Все уникальные жанры из текущего списка
  const genres = [...new Set(state.items.map((item) => item.genre))].sort((a, b) =>
    a.localeCompare(b, 'ru')
  );

  // Пересобираем select, сохраняя выбранное значение, если оно ещё существует
  els.filterGenre.replaceChildren();

  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = 'Все жанры';
  els.filterGenre.appendChild(allOption);

  genres.forEach((genre) => {
    const option = document.createElement('option');
    option.value = genre;
    option.textContent = genre;
    els.filterGenre.appendChild(option);
  });

  const hasCurrent = genres.includes(currentValue) || currentValue === 'all';
  els.filterGenre.value = hasCurrent ? currentValue : 'all';
}

function updateFacts() {
  els.factsCount.textContent = String(state.items.length);
  els.factsGenres.textContent = String(new Set(state.items.map((i) => i.genre)).size);
}

function updateCatalogStatus(visibleCount) {
  if (state.items.length === 0) {
    els.catalogStatus.textContent = 'Каталог пуст — добавьте первый квест.';
    return;
  }
  els.catalogStatus.textContent = `Показано ${visibleCount} из ${state.items.length}.`;
}

function render() {
  const visibleItems = getVisibleItems();

  // Перерисовываем список карточек
  els.cards.replaceChildren(...visibleItems.map(createCard));

  // Пустое состояние
  els.emptyState.hidden = visibleItems.length !== 0;

  updateCatalogStatus(visibleItems.length);
  updateFacts();
}

/* ---------- 9. Обработчики: поиск, фильтры, сортировка ---------- */

function handleSearchInput(event) {
  state.searchQuery = event.target.value;
  render();
}

function handleGenreChange(event) {
  state.selectedGenre = event.target.value;
  render();
}

function handleDifficultyChange(event) {
  state.selectedDifficulty = event.target.value;
  render();
}

function handleSortChange(event) {
  state.sortBy = event.target.value;
  render();
}

function handleResetFilters() {
  state.searchQuery = '';
  state.selectedGenre = 'all';
  state.selectedDifficulty = 'all';
  state.sortBy = 'year-desc';

  els.search.value = '';
  els.filterGenre.value = 'all';
  els.filterDifficulty.value = 'all';
  els.sort.value = 'year-desc';

  render();
}

/* ---------- 10. Делегирование событий: удаление карточек ---------- */

function handleCardsClick(event) {
  const deleteButton = event.target.closest('[data-action="delete"]');
  if (!deleteButton) return;

  const card = deleteButton.closest('.card');
  if (!card) return;

  const id = card.dataset.id;
  state.items = state.items.filter((item) => item.id !== id);

  saveItemsToStorage();
  updateGenreOptions();
  render();
}

/* ---------- 11. Модальное окно ---------- */

function openModal() {
  els.modal.hidden = false;
  document.body.classList.add('modal-open');

  // Фокус на первое поле — удобно для клавиатуры
  const firstField = els.form.querySelector('input, select, textarea');
  if (firstField) firstField.focus();
}

function closeModal() {
  els.modal.hidden = true;
  document.body.classList.remove('modal-open');

  els.form.reset();
  clearAllErrors();

  if (els.openModal) els.openModal.focus();
}

function clearAllErrors() {
  els.form.querySelectorAll('.field').forEach((field) => field.classList.remove('is-invalid'));
  els.form.querySelectorAll('.field__error').forEach((el) => { el.textContent = ''; });
}

/* ---------- 12. Валидация формы (Constraint Validation API) ---------- */

// Понятные сообщения для стандартных ошибок
function getErrorMessage(input) {
  const v = input.validity;

  if (v.valueMissing) {
    return input.type === 'select-one'
      ? 'Выберите значение из списка.'
      : 'Заполните это поле.';
  }
  if (v.tooShort) {
    return `Минимум ${input.minLength} символов.`;
  }
  if (v.tooLong) {
    return `Максимум ${input.maxLength} символов.`;
  }
  if (v.rangeUnderflow) {
    return `Значение не меньше ${input.min}.`;
  }
  if (v.rangeOverflow) {
    return `Значение не больше ${input.max}.`;
  }
  if (v.typeMismatch || v.badInput) {
    return 'Введите корректное значение.';
  }
  return 'Проверьте это поле.';
}

function showFieldError(input) {
  const field = input.closest('.field');
  if (!field) return;

  const errorEl = field.querySelector('.field__error');
  field.classList.add('is-invalid');
  if (errorEl) errorEl.textContent = getErrorMessage(input);
}

function clearFieldError(input) {
  const field = input.closest('.field');
  if (!field) return;

  const errorEl = field.querySelector('.field__error');
  field.classList.remove('is-invalid');
  if (errorEl) errorEl.textContent = '';
}

function validateForm() {
  const fields = [...els.form.querySelectorAll('input, select, textarea')];
  let firstInvalid = null;
  let isValid = true;

  fields.forEach((input) => {
    if (input.checkValidity()) {
      clearFieldError(input);
    } else {
      isValid = false;
      showFieldError(input);
      if (!firstInvalid) firstInvalid = input;
    }
  });

  if (firstInvalid) firstInvalid.focus();
  return isValid;
}

/* ---------- 13. Добавление квеста ---------- */

function handleFormSubmit(event) {
  event.preventDefault();

  if (!validateForm()) return;

  const formData = new FormData(els.form);

  const newItem = {
    id: generateId(),
    title: String(formData.get('title')).trim(),
    description: String(formData.get('description')).trim(),
    genre: String(formData.get('genre')),
    difficulty: String(formData.get('difficulty')),
    year: Number(formData.get('year')),
    hours: Number(formData.get('hours'))
  };

  state.items = [newItem, ...state.items];

  saveItemsToStorage();
  updateGenreOptions();
  render();
  closeModal();
}

/* ---------- 14. Инициализация ---------- */

function initEvents() {
  els.search.addEventListener('input', handleSearchInput);
  els.filterGenre.addEventListener('change', handleGenreChange);
  els.filterDifficulty.addEventListener('change', handleDifficultyChange);
  els.sort.addEventListener('change', handleSortChange);
  els.resetFilters.addEventListener('click', handleResetFilters);

  // Делегирование: один слушатель на контейнер карточек
  els.cards.addEventListener('click', handleCardsClick);

  // Модальное окно
  els.openModal.addEventListener('click', openModal);
  els.closeModal.addEventListener('click', closeModal);
  els.cancelModal.addEventListener('click', closeModal);

  // Клик по подложке (backdrop)
  els.modal.addEventListener('click', (event) => {
    if (event.target.dataset.close === 'backdrop') closeModal();
  });

  // Закрытие по Escape
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.modal.hidden) closeModal();
  });

  // Живая валидация: очищаем ошибку, как только поле стало валидным
  els.form.addEventListener('input', (event) => {
    const input = event.target;
    if (input.matches('input, select, textarea') && input.checkValidity()) {
      clearFieldError(input);
    }
  });

  els.form.addEventListener('submit', handleFormSubmit);
}

function init() {
  const stored = loadItemsFromStorage();
  state.items = stored ?? DEFAULT_ITEMS;

  // Синхронизируем начальные значения контролов со state
  els.search.value = state.searchQuery;
  els.filterDifficulty.value = state.selectedDifficulty;
  els.sort.value = state.sortBy;

  updateGenreOptions();
  els.filterGenre.value = state.selectedGenre;

  initEvents();
  render();
}

document.addEventListener('DOMContentLoaded', init);