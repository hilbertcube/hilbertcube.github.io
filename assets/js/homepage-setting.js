fetch('/website-test/assets/json/suggestions.json')
.then(response => response.json())
.then(data => {
    const articles = data.articles;
    //console.log('Number of articles:', articles.length);
    article(articles.length, true, false);
})
.catch(error => console.error('Error loading JSON:', error));

