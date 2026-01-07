const container = document.getElementById("container");
let bars = [];
const delay = 50;

// Helper function to pause execution for animation
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Swap two node elements by animating their parent wrappers (robust FLIP swap)
async function swapBars(b1, b2) {
    if (b1 === b2) return;
    const wrap1 = b1.parentElement;
    const wrap2 = b2.parentElement;
    const parent = wrap1.parentElement;

    // mark swapping for visuals
    wrap1.classList.add('swapping');
    wrap2.classList.add('swapping');

    // record first positions
    const r1 = wrap1.getBoundingClientRect();
    const r2 = wrap2.getBoundingClientRect();

    // perform DOM swap: if wrap1 is before wrap2, insert wrap2 before wrap1, else insert wrap1 before wrap2
    const pos = wrap1.compareDocumentPosition(wrap2);
    if (pos & Node.DOCUMENT_POSITION_FOLLOWING) {
        // wrap1 is before wrap2
        parent.insertBefore(wrap2, wrap1);
    } else {
        parent.insertBefore(wrap1, wrap2);
    }

    // record last positions
    const l1 = wrap1.getBoundingClientRect();
    const l2 = wrap2.getBoundingClientRect();

    // compute deltas
    const dx1 = r1.left - l1.left;
    const dx2 = r2.left - l2.left;
    const dy1 = r1.top - l1.top;
    const dy2 = r2.top - l2.top;

    // invert
    wrap1.style.transition = 'none';
    wrap2.style.transition = 'none';
    wrap1.style.transform = `translate(${dx1}px, ${dy1}px)`;
    wrap2.style.transform = `translate(${dx2}px, ${dy2}px)`;

    // force reflow
    wrap1.getBoundingClientRect();

    // animate to natural position
    const dur = 260;
    wrap1.style.transition = `transform ${dur}ms cubic-bezier(.2,.8,.2,1)`;
    wrap2.style.transition = `transform ${dur}ms cubic-bezier(.2,.8,.2,1)`;
    wrap1.style.transform = '';
    wrap2.style.transform = '';

    await new Promise(resolve => setTimeout(resolve, dur + 30));

    // cleanup
    wrap1.style.transition = '';
    wrap2.style.transition = '';
    wrap1.style.transform = '';
    wrap2.style.transform = '';
    wrap1.classList.remove('swapping');
    wrap2.classList.remove('swapping');

    // Rebuild bars array from DOM order so indices always match visual order
    bars = Array.from(container.querySelectorAll('.bar'));
}


// 1. Generate a new random array
function generateArray(numBars = 8) {
    container.innerHTML = ""; // Clear existing bars
    bars = [];
    for (let i = 0; i < numBars; i++) {
        const value = Math.floor(Math.random() * 100) + 10; // Logical value

        // wrapper holds the node and the numeric label below it
        const wrap = document.createElement('div');
        wrap.classList.add('bar-wrap');

        const node = document.createElement('div');
        node.classList.add('bar');

        // visual size for node (12-60px) scaled from value space
        const size = 12 + Math.round((value - 10) / 90 * 48);
        node.style.height = `${size}px`;
        node.style.width = `${size}px`;
        node.dataset.value = value; // store the logical value

        const lbl = document.createElement('div');
        lbl.classList.add('bar-label');
        lbl.textContent = value;

        wrap.appendChild(node);
        wrap.appendChild(lbl);
        container.appendChild(wrap);
        bars.push(node);
        // transient green highlight for freshly generated nodes
        wrap.classList.add('fresh');
        setTimeout(() => wrap.classList.remove('fresh'), 420);
    }
} 

// Initial Load
console.log("script.js loaded");
generateArray();

// State
let isSorting = false;

// Helpers: UI
function showStatus(msg, type = 'info') {
    const el = document.getElementById('status');
    if (!el) return;
    el.textContent = msg;
    el.style.color = type === 'error' ? 'salmon' : 'lightgreen';
}

function setButtonsDisabled(disabled) {
    document.querySelectorAll('.controls button').forEach(b => b.disabled = disabled);
}

async function runAlgorithm(fn, name) {
    if (isSorting) { showStatus('Already sorting', 'error'); return; }
    isSorting = true; setButtonsDisabled(true); showStatus(name + ' running...');
    try {
        await fn();
        // Ensure the entire array is marked as sorted (green) after successful run
        for (const b of bars) {
            b.classList.remove('compare', 'pivot');
            b.classList.add('sorted');
        }
        showStatus(name + ' completed', 'info');
    } catch (err) {
        console.error(err);
        showStatus('Error: ' + (err.message || err), 'error');
    } finally {
        isSorting = false; setButtonsDisabled(false);
    }
}

// Use Array input
function setArrayFromInput() {
    const input = document.getElementById('arrayInput').value.trim();
    if (!input) { showStatus('Please enter numbers separated by commas or spaces', 'error'); return; }
    const parts = input.split(/[,\s]+/).filter(Boolean);
    const nums = [];
    for (const p of parts) {
        const n = Number(p);
        if (Number.isNaN(n)) { showStatus('Invalid number: ' + p, 'error'); return; }
        nums.push(n);
    }
    if (nums.length > 200) { showStatus('Maximum 200 numbers allowed', 'error'); return; }

    // scale values to 20-420 px height
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = (max - min) || 1;

    container.innerHTML = '';
    bars = [];
    for (const v of nums) {
        // scale visual size to 12-60 px diameter
        const size = 12 + Math.round((v - min) / range * 48);

        const wrap = document.createElement('div');
        wrap.classList.add('bar-wrap');

        const node = document.createElement('div');
        node.classList.add('bar');
        node.style.height = `${size}px`;
        node.style.width = `${size}px`;
        node.dataset.value = v; // store original number

        const lbl = document.createElement('div');
        lbl.classList.add('bar-label');
        lbl.textContent = v;

        wrap.appendChild(node);
        wrap.appendChild(lbl);
        container.appendChild(wrap);
        bars.push(node);
        // transient green highlight for freshly loaded nodes
        wrap.classList.add('fresh');
        setTimeout(() => wrap.classList.remove('fresh'), 420);
    }
    showStatus('Array loaded (' + nums.length + ' elements)', 'info');
} 

// Button bindings
document.getElementById("newArrayBtn").addEventListener("click", () => { generateArray(); showStatus('Random array generated'); });
document.getElementById("useArrayBtn").addEventListener("click", setArrayFromInput);
document.getElementById("arrayInput").addEventListener('keydown', e => { if (e.key === 'Enter') setArrayFromInput(); });

document.getElementById("bubbleBtn").addEventListener("click", () => runAlgorithm(bubbleSort, 'Bubble Sort'));
document.getElementById("selectionBtn").addEventListener("click", () => runAlgorithm(selectionSort, 'Selection Sort'));
document.getElementById("insertionBtn").addEventListener("click", () => runAlgorithm(insertionSort, 'Insertion Sort'));
document.getElementById("quickBtn").addEventListener("click", () => runAlgorithm(quickSortWrapper, 'Quick Sort'));
document.getElementById("mergeBtn").addEventListener("click", () => runAlgorithm(runMergeSort, 'Merge Sort'));

// 2. Bubble Sort Implementation
async function bubbleSort() {
    for (let i = 0; i < bars.length; i++) {
        for (let j = 0; j < bars.length - i - 1; j++) {
            bars[j].classList.add("compare");
            bars[j + 1].classList.add("compare");
            await sleep(delay);
            const val1 = Number(bars[j].dataset.value);
            const val2 = Number(bars[j + 1].dataset.value);
            if (val1 > val2) {
                await swapBars(bars[j], bars[j + 1]);
            }
            bars[j].classList.remove("compare");
            bars[j + 1].classList.remove("compare");
        }
        bars[bars.length - i - 1].classList.add("sorted");
    }
    bars[0].classList.add("sorted");
} 

// 3. Quick Sort Implementation
async function quickSortWrapper() {
    await quickSort(0, bars.length - 1);
    // mark all as sorted at the end
    for (const b of bars) b.classList.add('sorted');
}

async function quickSort(start, end) {
    if (start >= end) return;
    let index = await partition(start, end);
    // Sort left then right sequentially to keep visualization predictable
    await quickSort(start, index - 1);
    await quickSort(index + 1, end);
}

async function partition(start, end) {
    let pivotIndex = start;
    const pivotValue = Number(bars[end].dataset.value);
    bars[end].classList.add('pivot');
    for (let i = start; i < end; i++) {
        bars[i].classList.add('compare');
        await sleep(delay);
        const val = Number(bars[i].dataset.value);
        if (val < pivotValue) {
            await swapBars(bars[i], bars[pivotIndex]);
            pivotIndex++;
        }
        bars[i].classList.remove('compare');
    }
    await swapBars(bars[pivotIndex], bars[end]);
    bars[end].classList.remove('pivot');
    bars[pivotIndex].classList.add('sorted');
    return pivotIndex;
} 

// 4. Selection Sort
async function selectionSort() {
    for (let i = 0; i < bars.length; i++) {
        let minIndex = i;
        bars[i].classList.add("compare");
        for (let j = i + 1; j < bars.length; j++) {
            bars[j].classList.add("compare");
            await sleep(delay);
            const val1 = Number(bars[j].dataset.value);
            const val2 = Number(bars[minIndex].dataset.value);
            if (val1 < val2) {
                if (minIndex !== i) bars[minIndex].classList.remove("compare");
                minIndex = j;
            } else {
                bars[j].classList.remove("compare");
            }
        }
        if (minIndex !== i) {
            await swapBars(bars[minIndex], bars[i]);
        }
        bars[minIndex].classList.remove("compare");
        bars[i].classList.add("sorted");
    }
} 

// 5. Insertion Sort
async function insertionSort() {
    for (let i = 1; i < bars.length; i++) {
        let j = i - 1;
        const keyValue = Number(bars[i].dataset.value);
        const keyHeight = bars[i].style.height;

        bars[i].classList.add('compare');
        await sleep(delay);

        while (j >= 0 && Number(bars[j].dataset.value) > keyValue) {
            bars[j].classList.add('compare');
            await swapBars(bars[j], bars[j + 1]); // perform adjacent swap to move it right
            j--;
            await sleep(delay);
            if (j+1 < bars.length) bars[j + 1].classList.remove('compare');
        }

        // ensure the item at j+1 holds the key
        bars[j + 1].classList.remove('compare');

        bars[i].classList.remove('compare');
    }
} 

// 6. Merge Sort Wrapper & Logic
async function runMergeSort() {
    await mergeSort(0, bars.length - 1);
}

async function merge(barsArr, low, mid, high) {
    // Perform stable merging by shifting elements from the right subarray into the left using adjacent swaps
    // so we animate physical node movement similar to other sorts.
    let i = low;
    let j = mid + 1;

    while (i <= mid && j <= high) {
        const valI = Number(barsArr[i].dataset.value);
        const valJ = Number(barsArr[j].dataset.value);
        if (valI <= valJ) {
            i++;
        } else {
            // move element at index j left to index i via adjacent swaps
            let idx = j;
            while (idx > i) {
                await swapBars(bars[idx - 1], bars[idx]);
                // small pause for clarity
                await sleep(30);
                idx--;
            }
            // update positions and pointers
            i++;
            mid++;
            j++;
            // refresh local reference to the latest DOM order
            barsArr = bars;
        }
    }

    // mark merged section as sorted
    for (let x = low; x <= high; x++) {
        if (bars[x]) bars[x].classList.add('sorted');
    }
} 

async function mergeSort(low, high) {
    if (low >= high) return;
    const mid = low + Math.floor((high - low) / 2);
    await mergeSort(low, mid);
    await mergeSort(mid + 1, high);
    await merge(bars, low, mid, high);
}