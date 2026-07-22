document.addEventListener('DOMContentLoaded', fetchAvailableMovies);
document.addEventListener('DOMContentLoaded', initIntro);

function initIntro() {
    const overlay = document.getElementById('intro-overlay');
    const video = document.getElementById('intro-video');
    const skipBtn = document.getElementById('intro-skip');
    const unmuteBtn = document.getElementById('intro-unmute');

    function dismissIntro() {
        overlay.classList.add('intro-hidden');
        video.pause();
    }

    // Move on once the clip finishes playing.
    video.addEventListener('ended', dismissIntro);

    // Let people skip straight to the site.
    skipBtn.addEventListener('click', dismissIntro);

    // Autoplay only works muted in most browsers, so offer a one-tap unmute.
    unmuteBtn.addEventListener('click', () => {
        video.muted = !video.muted;
        unmuteBtn.textContent = video.muted ? '🔇' : '🔊';
    });

    // Safety net: if the video can't load or play, don't trap the visitor.
    video.addEventListener('error', dismissIntro);
    setTimeout(dismissIntro, 8000);
}

function fetchAvailableMovies() {
    fetch('UPDATE API URL/update_api')  // <-- UPDATE API GOES ON THIS LINE
        .then(response => response.json())
        .then(data => {
            // Log the data to see the structure
            console.log("Fetched data:", data);
            // Ensure that data is an array of movie names
            const movieList = data.join('   •   ');
            document.getElementById('available-movies').textContent = movieList || 'No films loaded yet.';
        })
        .catch(error => {
            console.error('Error fetching movies:', error);
            document.getElementById('available-movies').textContent = 'Error fetching available movies.';
        });
}

document.getElementById('search-btn').addEventListener('click', searchMovie);
document.getElementById('movie-id-input').addEventListener('keydown', function (event) {
    if (event.key === 'Enter') {
        searchMovie();
    }
});

function searchMovie() {
    const movieName = document.getElementById('movie-id-input').value.trim();
    const resultsGrid = document.getElementById('table-body');
    const searchButton = document.getElementById('search-btn');
    if (!movieName) {
        alert('Please enter a Movie.');
        return;
    }
    searchButton.disabled = true;
    searchButton.textContent = 'Searching…';
    resultsGrid.innerHTML = '<p class="results-status">Rolling the film reel&hellip;</p>';
    fetch(`SEARCH API URL/search_api?movieName=${movieName}`)    // <-- SEARCH API GOES ON THIS LINE
        .then(response => response.json())
        .then(data => {
            resultsGrid.innerHTML = '';
            if (data && data.length > 0) {
                data.forEach(movie => {
                    const card = `<article class="ticket">
                        <div class="ticket-main">
                            <p class="ticket-eyebrow">Feature Presentation</p>
                            <h3 class="ticket-title">${movie.movies}</h3>
                            <p class="ticket-description">${movie.description}</p>
                        </div>
                        <div class="ticket-stub">
                            <div class="ticket-stat">
                                <span class="stat-label">Year</span>
                                <span class="stat-value">${movie.year}</span>
                            </div>
                            <div class="ticket-stat">
                                <span class="stat-label">Runtime</span>
                                <span class="stat-value">${movie.time}</span>
                            </div>
                            <div class="ticket-stat">
                                <span class="stat-label">Rating</span>
                                <span class="stat-value">${movie.rating}</span>
                            </div>
                        </div>
                    </article>`;
                    resultsGrid.insertAdjacentHTML('beforeend', card);
                });
            } else {
                resultsGrid.innerHTML = '<p class="results-empty">No results. Try another title.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
            resultsGrid.innerHTML = '<p class="results-error">Error fetching data. Please try again later.</p>';
        })
        .finally(() => {
            searchButton.disabled = false;
            searchButton.textContent = 'Search';
        });
}