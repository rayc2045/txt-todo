import 'https://esm.sh/@master/css';
import { createApp, reactive } from 'https://esm.sh/petite-vue';
import utils from './esm/utils.js';
import style from './esm/style.js';
import prefer from './esm/prefer.js';
import query from './esm/query.js';
import storage from './esm/localStorage.js';
import confetti from './esm/confetti.js';

const ROOT = '/public/txt';
const tutorialFile = `${ROOT}/如何使用 TXT Todo.txt`;
const fetchFile = query.file
  ? utils.formatFilePath(ROOT, query.file, 'txt')
  : tutorialFile;

const STORAGE_KEY = `txt-todo${
  fetchFile.startsWith('http') ? '-' : ''
}${fetchFile}`;
const store = storage.fetch(STORAGE_KEY);

const items = reactive([]);

const App = {
  promptMessage: '',
  filePath: store.filePath || fetchFile,
  totalProgress: 0,
  async init() {
    if (!query.isSave) {
      await this.parseFile();
      if (!query.isCycle) this.updateTotalProgress();
      this.updateSiteTitle();
      return storage.delete(STORAGE_KEY);
    }
    if (!store.items?.length) await this.parseFile();
    else {
      for (const storeItem of store.items) {
        if (query.isOpen) storeItem.open = true;
        if (query.isClose) storeItem.open = false;
        if (!query.isCycle) storeItem.completeTimes = 0;
        if (storeItem.tasks.length) {
          if (!query.isStrict)
            for (const task of storeItem.tasks) task.editable = true;
          if (storeItem.tasks.every(task => task.completed)) {
            if (query.isCycle) this.reset(storeItem);
            else if (query.isStrict) storeItem.tasks.at(-1).editable = true;
          } else if (query.isStrict) {
            let minCompleted = storeItem.tasks.findIndex(task => !task.completed);
            if (minCompleted < 0) minCompleted = storeItem.tasks.length;
            storeItem.tasks.forEach(
              (task, idx) => (task.completed = idx < minCompleted)
            );
            this.update(storeItem);
          }
        }
        items.push(storeItem);
      }
    }
    if (!query.isCycle) this.updateTotalProgress();
    this.updateSiteTitle();
    this.save();
  },
  async parseFile() {
    const res = await utils.readTextFile(fetchFile, tutorialFile);
    if (!query.file) this.promptMessage = '未指定檔案';
    else if (res.status === 'Blocked') this.promptMessage = '檔案讀取失敗';
    else if (res.status === 'Not found') this.promptMessage = '找不到檔案';
    this.renderTodo(res);
  },
  renderTodo({ file, text }) {
    this.filePath = file;
    this.parseText(text);
  },
  parseText(text) {
    text =
      text.trim() ||
      `
      沒有顯示內容？
      - 檢查 ${fetchFile} 檔案
      - 參考 ${tutorialFile} 檔案，加入待辦事項
      - 開啟新視窗，以當前不帶有「autosave」查詢字串的網址載入網頁
      - 如果想開啟自動儲存功能，在網址中加入「autosave」查詢字串再重新載入
    `;

    for (const paragraph of text.split('\n\n')) {
      if (!paragraph.trim() || paragraph.startsWith('//')) continue;
      const data = { title: '', descriptions: [], tasks: [] };
      paragraph
        .split('\n')
        .filter(p => p.trim())
        .forEach((line, lineIdx) => {
          line = line.trim();
          if (lineIdx === 0) return (data.title = line);
          if (line.startsWith('-')) {
            const task = line.replace('-', '').trim();
            if (task) data.tasks.push(task);
            return;
          }
          data.descriptions.push(line);
        });
      items.push({
        title: data.title,
        open: query.isOpen,
        completeTimes: 0,
        progress: 0,
        descriptions: data.descriptions,
        tasks: data.tasks.map((task, taskIdx) => ({
          task,
          completed: false,
          editable: taskIdx === 0 || !query.isStrict,
        })),
      });
    }
  },
  updateSiteTitle() {
    document.title = utils.getUppercaseFileName(this.filePath);
  },
  toggleOpen(item, open = !item.open) {
    item.open = open;
    if (query.isSave) this.save();
  },
  async toggleCompleted(item, taskId, el) {
    const task = item.tasks[taskId];
    if (!task.editable) return;
    task.completed = !task.completed;
    this.update(item);
    if (!query.isCycle) this.updateTotalProgress();

    const progressEl = el
      .closest('section')
      .querySelector('h2 > span:last-of-type');

    async function animateProgress() {
      await utils.animateNumber(
        progressEl,
        progressEl.textContent,
        item.progress,
        300
      );
    }

    if (item.progress < 100) {
      if (prefer.motion) await animateProgress();
      return;
    }

    for (const task of item.tasks) task.editable = false;
    if (prefer.motion) await animateProgress();
    confetti.basicCannon();
    setTimeout(() => {
      if (query.isCycle) {
        if (!query.isStrict)
          for (const task of item.tasks) task.editable = true;
        return this.reset(item);
      }
      if (query.isStrict) return (item.tasks.at(-1).editable = true);
      for (const task of item.tasks) task.editable = true;
    }, 3000);
  },
  updateTotalProgress() {
    let completedNum = 0;
    let total = 0;
    for (const item of items) {
      for (const task of item.tasks) {
        if (task.completed) completedNum++;
        total++;
      }
    }
    this.totalProgress = utils.getProgress(completedNum, total);
  },
  update(item) {
    // update progress
    const completedTasksNum = item.tasks.filter(task => task.completed).length;
    item.progress = utils.getProgress(completedTasksNum, item.tasks.length);
    // update editable
    if (query.isStrict) {
      for (const task of item.tasks) task.editable = false;
      if (!completedTasksNum) item.tasks[0].editable = true;
      else {
        const lastCompleteId = completedTasksNum - 1;
        item.tasks[lastCompleteId].editable = true;
        if (completedTasksNum < item.tasks.length)
          item.tasks[lastCompleteId + 1].editable = true;
      }
    }
    if (query.isSave) this.save();
  },
  reset(item) {
    item.completeTimes++;
    for (const task of item.tasks) task.completed = false;
    this.update(item);
  },
  save() {
    storage.save(STORAGE_KEY, {
      filePath: this.filePath,
      items,
    });
  },
};

createApp({ ...App, items, utils, style, prefer, query }).mount();

window.onload = () => {
  document.body.removeAttribute('style');
  document.querySelector('#loader').remove();
};

// let oldScrollY = window.scrollY;

window.onscroll = () => {
  // // <header class="sticky top:0">
  // const headerEl = document.querySelector('header');
  // const headerHeight = headerEl.getBoundingClientRect().height;
  // if (oldScrollY < window.scrollY) headerEl.style.top = `-${headerHeight}px`;
  // else if (!utils.isVisible(headerEl)) headerEl.style.top = '0px';
  // oldScrollY = window.scrollY;

  if (!query.isClose) return;
  const sectionEls = Array.from(document.querySelectorAll('main > section'));
  sectionEls.forEach((sectionEl, idx) => {
    if (!utils.isVisible(sectionEl)) App.toggleOpen(items[idx], false);
  });
};
