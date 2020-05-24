/* eslint-env browser */

const rssParse = (data) => {
  const domparser = new DOMParser();
  const doc = domparser.parseFromString(data, 'text/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(parseError.textContent);
  }

  const title = doc.querySelector('channel > title').textContent;
  const description = doc.querySelector('channel > description').textContent;
  const feedItems = doc.querySelectorAll('item');
  const items = [...feedItems].map((item) => {
    const itemTitle = item.querySelector('title').textContent;
    const link = item.querySelector('link').textContent;
    return { title: itemTitle, link };
  });

  return { title, description, items };
};

export default rssParse;
