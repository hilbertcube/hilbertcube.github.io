MathJax = {
    tex: {tags: 'ams', inlineMath: [['$', '$'], ['\\(', '\\)']]},
    svg: {fontCache: 'global', scale: 1.00},
    chtml: {
        scale: 1.00
    }
};

// window.addEventListener('load', () => {
//     if (typeof MathJax !== 'undefined') {
//       document.querySelectorAll('.equation').forEach(section => {
//         MathJax.typesetPromise([section]).catch((err) => console.log(err.message));
//       });
//     } else {
//       console.log("MathJax did not load correctly.");
//     }
//   });

const ROOT = '/neumanncondition';

// TAB ICON
const link = document.createElement('link');
link.rel = 'icon';
link.href = ROOT + '/public/Images/Logo/favicon.png';
link.type = 'image/png';
document.head.appendChild(link);


// OPEN URL IN NEW WINDOWS
document.querySelectorAll('.url').forEach(function(element) {
    element.onclick = function() {
        window.open(this.href);
        return false;
    };
    element.onkeypress = function() {
        window.open(this.href);
        return false;
    };
});

/// NAVIGATE TO IMAGE BASED ON ROOT
function navigateToImage(element) {
    const newUrl = ROOT + element.getAttribute('src');
    location.href = newUrl;
}


// SIDE NAV
function toggleNav() {
    var navbar = document.getElementById('navbar');
    var body = document.body;

    if (navbar.classList.contains('open')) {
        navbar.classList.remove('open');
        navbar.classList.add('closed');
        body.classList.remove('nav-open');
        body.classList.add('nav-closed');
    } 
    else {
        navbar.classList.remove('closed');
        navbar.classList.add('open');
        body.classList.remove('nav-closed');
        body.classList.add('nav-open');
    }
}



// FUNCTION FOR CLOSING SIDE NAV
// if window width is less than 1200px, close the side nav
function checkWidthAndToggle() {
    const body = document.body;
    const navbar = document.querySelector('.navbar');
    const toggleBtn = document.querySelector('.toggle-btn');

    if (window.innerWidth < 1200) {
        body.classList.remove('nav-open');
        body.classList.add('nav-closed');
        navbar.classList.remove('open');
        navbar.classList.add('closed');
    } 
    else {
        body.classList.add('nav-open');
        body.classList.remove('nav-closed');
        navbar.classList.add('open');
        navbar.classList.remove('closed');
    }
}
checkWidthAndToggle();
window.addEventListener('resize', checkWidthAndToggle); // Event listener for window resize



// COPY BUTTON
function copyButton() {
    const copyButtons = document.querySelectorAll('.copy-btn');
    const codeBlocks = document.querySelectorAll('.code-container code');

    copyButtons.forEach((button, index) => {
        button.addEventListener('click', function (event) {
            event.preventDefault(); // Prevent default action for better control
            const code = codeBlocks[index];

            if (code && code.innerText.trim() !== '') {
                // Fallback to use a temporary textarea
                const textarea = document.createElement('textarea');
                textarea.value = code.innerText;
                document.body.appendChild(textarea);
                textarea.select();
                try {
                    document.execCommand('copy');
                    button.textContent = 'Copied!';
                } catch (e) {
                    button.textContent = 'Failed to copy';
                }
                document.body.removeChild(textarea);
                
                setTimeout(function () {
                    button.textContent = 'Copy';
                }, 1000);
            } else {
                button.textContent = 'No text to copy';
            }
        });
    });
}
copyButton();





// TOP NAV DROPDOWN
// function dropDown(dropdownId) {
//     var dropdown = document.getElementById(dropdownId);
//     dropdown.classList.toggle("show");
// }


// Close the dropdown if the user clicks outside of it
window.onclick = function(event) {
    condition = event.target.matches('.dropbtn') || event.target.matches('.switch') || event.target.matches('.slider') || event.target.matches('#modeToggle');
    if (!condition) {
        var dropdowns = document.getElementsByClassName("dropdown-content");
        for (var i = 0; i < dropdowns.length; i++) {
            var openDropdown = dropdowns[i];
            if (openDropdown.classList.contains('show')) {
                openDropdown.classList.remove('show');
            }
        }
    }
}

// drop down menu
function applyDropdownDelays() {
    document.querySelectorAll('.dropdown-content').forEach(dropdown => {
        dropdown.querySelectorAll('a').forEach((item, index) => {
            item.style.animationDelay = `${(0.06) * index}s`; // Adjust delay increment as needed
        });
    });
}

function dropDown(dropdownId) {
    var dropdown = document.getElementById(dropdownId);
    dropdown.classList.toggle("show");
    applyDropdownDelays(); // Apply delays whenever dropdown is shown
}

// Ensure delays are set on page load
document.addEventListener('DOMContentLoaded', applyDropdownDelays);




// ARTICLES
const image_root = ROOT + '/public/Images/';

function article(NUM_ARTICLE, des, random_article){

    fetch(ROOT + '/assets/json/suggestions.json')
        .then(response => response.json())
        .then(data => {
            // Access the articles array within the fetched JSON data
            const articles = data.articles;

            // Shuffle the articles if random_article is true
            if (random_article) shuffleArray(articles);

            // Display only the first NUM_ARTICLE articles
            displayArticles(articles.slice(0, NUM_ARTICLE));
        })
        .catch(error => console.error('Error loading articles:', error));

    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // Function to display the articles
    function displayArticles(articles) {
        const container = document.getElementById('rec-article-container');
        container.innerHTML = ''; // Clear the container before adding new articles

        articles.forEach(article => {
            const articleLink = document.createElement('a');
            articleLink.href = ROOT +  article.link;
            articleLink.classList.add('article');
            articleLink.target = "_blank"; // Open link in a new tab (optional)
            // articleLink.setAttribute('data-aos', 'fade-up');

            const img = document.createElement('img');
            img.src = image_root + article.image;
            img.alt = article.title;

            const title = document.createElement('div');
            title.classList.add('article-name');
            title.textContent = article.title;


            const topic = document.createElement('div');
            topic.classList.add('article-topic');
            topic.textContent =  'Topics: ' + article.topic;

            const description = document.createElement('div');
            description.classList.add('article-description');
            description.textContent = article.description;

            const date = document.createElement('div');
            date.classList.add('article-date');
            date.textContent = 'Updated ' + article.date;

            articleLink.appendChild(img);
            articleLink.appendChild(title);
            
            if(des){
                articleLink.appendChild(topic);
                articleLink.appendChild(description);
                articleLink.appendChild(date);
            }
            
            container.appendChild(articleLink);

            // Apply border based on the 'des' boolean
            if (des) {
                title.style.borderBottom = '1px solid var(--nav-line-color)';

            } else {
                title.style.borderBottom = 'none';
            }
        });


        mobileHover(['.article']);
    }
}

// MOBILE HOVER BEHAVIOR
function mobileHover(arr){
    // Hover effect on mobile
    //const classes = ['.article', '.materials-right img'];
    arr.forEach((className) => {
    const elements = document.querySelectorAll(className);

    elements.forEach((element) => {
        // Add touchstart event listener
        element.addEventListener('touchstart', () => {
        element.classList.add('touch-hover-effect');
        });

        element.addEventListener('touchend', () => {
        // Remove touch effect
        element.classList.remove('touch-hover-effect');
        });
    });
    });
}

mobileHover(['.materials-right img', '.hyperlink']);





// CHANGE TAB FUNCTION
// nav_item_name <-> switch_target

function changeTab(evt, nav_item_name, switch_target) {
    var tablinks = document.getElementsByClassName("tab-button");
    var x = document.getElementsByClassName(switch_target);
    for (var i = 0; i < x.length; i++) {
        x[i].style.display = "none";
    }
    document.getElementById(nav_item_name).style.display = "block";

    for (var i = 0; i < x.length; i++) {
        tablinks[i].className = tablinks[i].className.replace(" tab-effect", "");
    }
    evt.currentTarget.className += " tab-effect";
}






// LOAD SUGGESTIONS ON SIDE NAV
function loadAndSetupSuggestions() {
    fetch(ROOT + '/assets/json/suggestions.json')
        .then(response => response.json())
        .then(data => {
            const articles = data.articles;
            document.querySelectorAll('.home-li').forEach(li => {
                const title = li.getAttribute('data-id');
                const article = articles.find(article => article.id === title);

                if (article) {
                    // Create a link element for the image
                    const articleLink = document.createElement('a');
                    articleLink.href = ROOT + article.link;
                    articleLink.target = "_blank"; // Open link in a new tab (optional)
                    articleLink.className = 'recommend-img';

                    // Create and add the image dynamically
                    const img = document.createElement('img');
                    img.src = image_root + article.image;
                    img.alt = article.title;
                    
                    // Append the image to the link
                    articleLink.appendChild(img);

                    // Create a span element to hold the title
                    const titleSpan = document.createElement('span');
                    titleSpan.textContent = article.title;

                    // Clear any existing content and append the title and link (which contains the image) to the li element
                    li.textContent = ''; // Clear any existing text
                    li.appendChild(titleSpan); // Append the title
                    li.appendChild(articleLink); // Append the link with image
                }
            });

            // Setup dropdown effect
            setupDropdownEffect();
        })
        .catch(error => console.error('Error loading articles:', error));
}



// SUGGESTION DROPDOWN BEHAVIOR
function setupDropdownEffect() {
    const listItems = document.querySelectorAll('.home-li');

    listItems.forEach(li => {
        const img = li.querySelector('img');
        const li_a = li.querySelector('a');

        // Set initial state for mobile
        let isExpanded = img.style.maxHeight !== '0px' && img.style.maxHeight; 

        // Ensure pointer events are set initially
        li_a.style.pointerEvents = isExpanded ? 'auto' : 'none';
        
        li.addEventListener('click', () => {
            isExpanded = img.style.maxHeight !== '0px' && img.style.maxHeight;
            img.style.maxHeight = isExpanded ? '0' : img.naturalHeight + 'px';
            img.style.opacity = isExpanded ? '0' : '1';
            li_a.style.pointerEvents = isExpanded ? 'none' : 'auto'; // Toggle pointer events

            // Toggle the class to show/hide the pseudo-element
            if (isExpanded) {
                li_a.classList.remove('show-read-more');
            } else {
                li_a.classList.add('show-read-more');
            }
        });
        

        // Ensure initial state
        img.style.maxHeight = img.style.maxHeight || '0';
        img.style.opacity = img.style.opacity || '0';
    });
}

// SMOOTHS SCROLLING
// has to use with scroll-padding-top: 120px; in html{} for smoothness
$(document).ready(function() {
    // Add smooth scrolling to all links
    $("a").on('click', function(event) {
        // Make sure this.hash has a value before overriding default behavior
        if (this.hash !== "") {
            // Prevent default anchor click behavior
            event.preventDefault();

            // Store hash
            var hash = this.hash;

            // Adjust the scroll position by subtracting the navbar height
            var Offset = 120; // Height of navbar
            var targetOffset = $(hash).offset().top - Offset;

            // Using jQuery's animate() method to add smooth page scroll
            // 800 milliseconds to scroll to the specified area
            $('html, body').animate({
                scrollTop: targetOffset
            }, 800, function() {
                // Add hash (#) to URL when done scrolling (default click behavior)
                // enable this thing to add hash
                window.location.hash = hash;
            });
        }
    });
});


// SHARE BUTTON
function toggleShareOptions(event) {
    event.preventDefault();
    const shareOptionsContainer = document.getElementById('shareOptions');
    const shareOptions = shareOptionsContainer.querySelectorAll('.share-option');

    // Toggle the visibility of the share options
    if (shareOptionsContainer.style.display === 'none' || shareOptionsContainer.style.display === '') {
        shareOptionsContainer.style.display = 'block';

        // Show each option with a delay
        shareOptions.forEach((option, index) => {
            option.style.opacity = '0';
            option.style.display = 'block';
            setTimeout(() => {
                option.style.opacity = '1';
                option.style.transition = 'opacity .5s ease';
            }, index * 100);
        });
    } else {
        // Hide all options at once
        shareOptions.forEach((option) => {
            option.style.display = 'none';
        });
        shareOptionsContainer.style.display = 'none';
    }
}

// SHARE OPTIONS
function sharePage(event, platform) {
    event.preventDefault();
    const pageUrl = window.location.href; // Get the current page URL
    let shareUrl = '';

    switch (platform) {
        case 'facebook':
            shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
            break;
        case 'twitter':
            shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=Check%20this%20out!`;
            break;
        case 'whatsapp':
            shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(pageUrl)}`;
            break;
        case 'reddit':
            shareUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(pageUrl)}&title=Interesting%20page`;
            break;
        default:
            return;
    }

    window.open(shareUrl, '_blank'); // Open the share link in a new tab
}



class equation extends HTMLElement {
    constructor() {
      super();
    }
    // Element functionality written in here
  }


const solutions = document.querySelectorAll('.solution');
solutions.forEach((solution) => {
    solution.setAttribute('open', '');
});

document.querySelectorAll('img').forEach(img => {
    img.setAttribute('loading', 'lazy');
});


