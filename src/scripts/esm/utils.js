export default {
  getQueryParams(url = window.location.href) {
    const urlSearch = url.split('?')[1];
    const urlSearchParams = new URLSearchParams(urlSearch);
    return Object.fromEntries(urlSearchParams.entries());
  },
  async fetchText(file, defaultFile) {
    let res;
    let status = 'Ok';
    try {
      res = await fetch(file);
    } catch (error) {
      status = 'Blocked';
      file = defaultFile;
      res = await fetch(file);
    }
    if (!res.ok) {
      status = 'Not found';
      file = defaultFile;
      res = await fetch(file);
    }
    return {
      status,
      file,
      text: await res.text(),
    };
  },
  formatFilePath(root, path, type) {
    if (path.startsWith('file://')) return path;

    if (path.startsWith('http'))
      return path.split(' ').join('+').replace('+', '?').replaceAll('+', '&');

    let newPath = '';
    if (!path.startsWith(root) || !path.startsWith(root.replace('/', '')))
      newPath += root;
    if (!path.startsWith('/')) newPath += '/';
    newPath += path;
    if (!newPath.endsWith(`.${type}`)) newPath += `.${type}`;

    return `/${newPath
      .replace(root.repeat(2), root)
      .split('/')
      .filter(split => split.length)
      .join('/')}`;
  },
  getUppercaseFileName(path, separator = '_') {
    return path
      .split('/')
      .at(-1)
      .split('.')[0]
      .split(separator)
      .map(str => this.capitalizeFirstLetter(str))
      .join(' ');
  },
  capitalizeFirstLetter(str) {
    return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
  },
  getProgress(num1, num2) {
    return Math.floor((num1 / num2) * 100);
  },
  isVisible(el) {
    const elTop = ~-el.getBoundingClientRect().top;
    const elBottom = ~-el.getBoundingClientRect().bottom;
    return elTop < window.innerHeight && elBottom >= 0;
  },
};
