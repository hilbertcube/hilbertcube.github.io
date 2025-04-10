fetch('latest_commit.json')
      .then(res => res.json())
      .then(commit => {
        const message = commit.commit.message;
        const author = commit.commit.author.name;
        const date = commit.commit.author.date;
        document.getElementById('commit-info').textContent =
          `Message: ${message}\nAuthor: ${author}\nDate: ${date}`;
      });