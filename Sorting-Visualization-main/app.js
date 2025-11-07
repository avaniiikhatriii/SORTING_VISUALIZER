// ===== UI elements =====
const barsEl = document.getElementById("bars");
const sizeSpeed = document.getElementById("sizeSpeed");
const btnNew = document.getElementById("btnNew");
const algoButtons = Array.from(document.querySelectorAll(".btn.algo"));

// ===== State =====
let arr = [];
let running = false;

// Map slider (1..100) -> size (10..80) and delay (fast..slow)
// Reduced max size so visualizations use fewer, wider bars by default.
function sliderToSize(val) {
  return Math.round(10 + (val / 100) * (80 - 10));
}
function sliderToDelay(val) {
  // higher slider => faster (smaller delay)
  const minMs = 3,
    maxMs = 240;
  const t = val / 100; // 0..1
  return Math.round(maxMs - t * (maxMs - minMs));
}
function currentDelay() {
  return sliderToDelay(+sizeSpeed.value);
}

// ===== Array / bars =====
function genArray() {
  const n = sliderToSize(+sizeSpeed.value);
  arr = Array.from({ length: n }, () => 5 + Math.floor(Math.random() * 95)); // values 5..100
  renderBars();
}
function renderBars() {
  barsEl.innerHTML = "";
  const n = arr.length;

  // set width so all bars fit inside the bars container area
  // use the actual container width so sizing keeps the visual area constant
  const innerWidth = barsEl.clientWidth; // includes padding specified in CSS
  const gap = 6; // matches .bars gap in CSS
  // Compute per-bar width so n*w + (n-1)*gap <= innerWidth
  // Allow width to shrink as n increases; clamp to a small minimum so bars don't disappear
  const w = Math.max(2, Math.floor((innerWidth - (n - 1) * gap) / n));

  arr.forEach((v) => {
    const d = document.createElement("div");
    d.className = "bar";
    d.style.height = `${v}%`;
    d.style.width = `${w}px`;
    d.dataset.value = String(v);
    barsEl.appendChild(d);
  });
}
function bars() {
  return Array.from(document.querySelectorAll(".bar"));
}
function setHeight(i, v) {
  const b = bars()[i];
  if (!b) return;
  b.style.height = `${v}%`;
  b.dataset.value = String(v);
}

function disableUI(disabled) {
  btnNew.disabled = disabled;
  sizeSpeed.disabled = disabled;
  algoButtons.forEach((b) => (b.disabled = disabled));
}

// ===== Viz helpers used by algorithms =====
const viz = {
  arr,
  async delay() {
    await new Promise((res) => setTimeout(res, currentDelay()));
  },
  markCompare(i, j) {
    const bs = bars();
    if (bs[i]) bs[i].classList.add("compare");
    if (bs[j]) bs[j].classList.add("compare");
  },
  unmarkCompare(i, j) {
    const bs = bars();
    if (bs[i]) bs[i].classList.remove("compare");
    if (bs[j]) bs[j].classList.remove("compare");
  },
  markSorted(i) {
    const b = bars()[i];
    if (b) b.classList.add("sorted");
  },
  clearMarks() {
    bars().forEach((b) => b.classList.remove("compare", "sorted"));
  },
  async swap(i, j) {
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setHeight(i, arr[i]);
    setHeight(j, arr[j]);
    await this.delay();
  },
  async set(i, v) {
    arr[i] = v;
    setHeight(i, v);
    await this.delay();
  },
};

// ===== Algorithms (async for animation) =====
async function bubbleSort() {
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      viz.markCompare(j, j + 1);
      await viz.delay();
      if (arr[j] > arr[j + 1]) {
        await viz.swap(j, j + 1);
        swapped = true;
      }
      viz.unmarkCompare(j, j + 1);
    }
    viz.markSorted(n - i - 1);
    if (!swapped) break;
  }
  for (let k = 0; k < n; k++) viz.markSorted(k);
}

async function insertionSort() {
  const n = arr.length;
  for (let i = 1; i < n; i++) {
    let key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      viz.markCompare(j, j + 1);
      arr[j + 1] = arr[j];
      setHeight(j + 1, arr[j + 1]);
      await viz.delay();
      viz.unmarkCompare(j, j + 1);
      j--;
    }
    arr[j + 1] = key;
    setHeight(j + 1, key);
    await viz.delay();
  }
  for (let k = 0; k < n; k++) viz.markSorted(k);
}

async function selectionSort() {
  // (not on UI but kept if needed)
  const n = arr.length;
  for (let i = 0; i < n; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      viz.markCompare(min, j);
      await viz.delay();
      if (arr[j] < arr[min]) min = j;
      viz.unmarkCompare(min, j);
    }
    if (min !== i) await viz.swap(i, min);
    viz.markSorted(i);
  }
}

async function heapSort() {
  const n = arr.length;

  async function heapify(n, i) {
    let largest = i;
    const l = 2 * i + 1,
      r = 2 * i + 2;

    if (l < n) {
      viz.markCompare(largest, l);
      await viz.delay();
      viz.unmarkCompare(largest, l);
      if (arr[l] > arr[largest]) largest = l;
    }
    if (r < n) {
      viz.markCompare(largest, r);
      await viz.delay();
      viz.unmarkCompare(largest, r);
      if (arr[r] > arr[largest]) largest = r;
    }
    if (largest !== i) {
      await viz.swap(i, largest);
      await heapify(n, largest);
    }
  }

  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    await heapify(n, i);
  }
  for (let i = n - 1; i > 0; i--) {
    await viz.swap(0, i);
    viz.markSorted(i);
    await heapify(i, 0);
  }
  viz.markSorted(0);
}

async function mergeSort() {
  async function merge(l, m, r) {
    const left = arr.slice(l, m + 1);
    const right = arr.slice(m + 1, r + 1);
    let i = 0,
      j = 0,
      k = l;

    while (i < left.length && j < right.length) {
      viz.markCompare(l + i, m + 1 + j);
      await viz.delay();
      viz.unmarkCompare(l + i, m + 1 + j);

      if (left[i] <= right[j]) {
        arr[k] = left[i];
        setHeight(k, arr[k]);
        i++;
      } else {
        arr[k] = right[j];
        setHeight(k, arr[k]);
        j++;
      }
      k++;
      await viz.delay();
    }
    while (i < left.length) {
      arr[k] = left[i++];
      setHeight(k, arr[k]);
      k++;
      await viz.delay();
    }
    while (j < right.length) {
      arr[k] = right[j++];
      setHeight(k, arr[k]);
      k++;
      await viz.delay();
    }
  }

  async function sort(l, r) {
    if (l >= r) return;
    const m = l + Math.floor((r - l) / 2);
    await sort(l, m);
    await sort(m + 1, r);
    await merge(l, m, r);
  }

  await sort(0, arr.length - 1);
  for (let i = 0; i < arr.length; i++) viz.markSorted(i);
}

async function quickSort() {
  async function partition(l, r) {
    const pivot = arr[r];
    let i = l - 1;
    for (let j = l; j < r; j++) {
      viz.markCompare(j, r);
      await viz.delay();
      viz.unmarkCompare(j, r);
      if (arr[j] <= pivot) {
        i++;
        await viz.swap(i, j);
      }
    }
    await viz.swap(i + 1, r);
    return i + 1;
  }

  async function sort(l, r) {
    if (l >= r) return;
    const p = await partition(l, r);
    await sort(l, p - 1);
    await sort(p + 1, r);
  }

  await sort(0, arr.length - 1);
  for (let i = 0; i < arr.length; i++) viz.markSorted(i);
}

/* Radix Sort (LSD, base 10). Values are 5..100 so safe. */
async function radixSort() {
  const maxVal = Math.max(...arr);
  let exp = 1; // 1, 10, 100...

  while (Math.floor(maxVal / exp) > 0) {
    // counting sort by digit
    const out = new Array(arr.length).fill(0);
    const cnt = new Array(10).fill(0);

    for (let i = 0; i < arr.length; i++) {
      const digit = Math.floor(arr[i] / exp) % 10;
      cnt[digit]++;
    }
    for (let i = 1; i < 10; i++) cnt[i] += cnt[i - 1];

    for (let i = arr.length - 1; i >= 0; i--) {
      const digit = Math.floor(arr[i] / exp) % 10;
      out[--cnt[digit]] = arr[i];
    }
    for (let i = 0; i < arr.length; i++) {
      await viz.set(i, out[i]);
    }
    exp *= 10;
  }
  for (let i = 0; i < arr.length; i++) viz.markSorted(i);
}

// ===== Runner =====
async function run(algoKey) {
  if (running) return;
  running = true;
  disableUI(true);
  viz.clearMarks();

  try {
    if (algoKey === "bubble") await bubbleSort();
    else if (algoKey === "insertion") await insertionSort();
    else if (algoKey === "heap") await heapSort();
    else if (algoKey === "merge") await mergeSort();
    else if (algoKey === "quick") await quickSort();
    else if (algoKey === "radix") await radixSort();
  } catch (e) {
    console.error(e);
  } finally {
    disableUI(false);
    running = false;
  }
}

// ===== Events =====
btnNew.addEventListener("click", () => {
  if (!running) genArray();
});
sizeSpeed.addEventListener("input", () => {
  if (!running) genArray();
});
algoButtons.forEach((b) => {
  b.addEventListener("click", () => run(b.dataset.algo));
});

// ===== Init =====
genArray();
window.addEventListener("resize", () => {
  if (!running) renderBars();
});
