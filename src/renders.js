/* eslint no-param-reassign: "error" */
/* eslint-env browser */

const render = (state, output, form) => {
  form.reset();
  if (state.feeds.length === 0) {
    return;
  }
  const ul = document.createElement('ul');
  ul.classList.add('list-group', 'list-group-flush', 'list-group-item-action');
  state.feeds.forEach((feed) => {
    const li = document.createElement('li');
    li.classList.add('list-group-item', 'list-group-item-action');
    li.append(document.createTextNode(feed.title));
    li.append(' - ');
    li.append(document.createTextNode(feed.description));

    const postsForRendering = state.posts.filter(({ feedId }) => feedId === feed.id);

    postsForRendering.forEach((post) => {
      const div = document.createElement('div');
      const link = document.createElement('a');
      link.innerHTML = post.postTitle;
      link.href = post.postLink;
      link.setAttribute('target', '_blank');
      div.append(link);
      li.append(div);
    });
    ul.append(li);
  });
  output.innerHTML = '';
  output.append(ul);
};

const renderError = (field, error) => {
  const errorElement = field.nextElementSibling;
  if (errorElement) {
    field.classList.remove('is-invalid');
    errorElement.remove();
  }
  if (error instanceof Error) {
    const feedbackElement = document.createElement('div');
    feedbackElement.classList.add('invalid-feedback');
    feedbackElement.innerHTML = error.message;
    field.classList.add('is-invalid');
    field.after(feedbackElement);
  }
};

const renderForm = (form, state) => {
  const field = form.elements.rss;
  const submit = form.elements.add;

  switch (state.form.processState) {
    case 'filling':
      field.value = '';
      submit.classList.remove('disabled');
      field.removeAttribute('readonly');
      break;
    case 'adding':
      renderError(field, {});
      submit.classList.add('disabled');
      field.setAttribute('readonly', true);
      break;
    case 'failed':
      renderError(field, state.form.errors);
      submit.classList.remove('disabled');
      field.removeAttribute('readonly');
      break;
    case 'finished':
      submit.classList.remove('disabled');
      field.removeAttribute('readonly');
      break;
    default:
      throw new Error(`Unknown form state: '${state.form.processState}'`);
  }
};

export { render, renderError, renderForm };
