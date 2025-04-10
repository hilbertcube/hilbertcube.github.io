const https = require('https');
const fs = require('fs');

// Fetch the GitHub token from environment variables
const token = process.env.GITHUB_TOKEN;
const username = 'Continuum3416'; // Your GitHub username
const repoName = 'neumanncondition'; // Your repository name

// Create a request options object for the repository info
const repoOptions = {
  hostname: 'api.github.com',
  port: 443,
  path: `/repos/${username}/${repoName}`,
  method: 'GET',
  headers: {
    'User-Agent': 'GitHub API Request',
    'Authorization': `Bearer ${token}`
  }
};

// Function to fetch repository data
function fetchRepoData() {
  return new Promise((resolve, reject) => {
    https.get(repoOptions, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve(JSON.parse(data)); // Resolve with the repository data
      });
      
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Save the repository data to a file
fetchRepoData().then(repo => {
  const repoData = {
    name: repo.name,
    full_name: repo.full_name,
    description: repo.description,
    updated_at: repo.updated_at,
    owner: repo.owner.login
  };
  
  // Save data to repo-data.json
  fs.writeFileSync('./public/repo-data.json', JSON.stringify([repoData], null, 2));
  console.log('Repository data saved to repo-data.json');
}).catch(err => {
  console.error('Error fetching repo data:', err);
});

// Fetch the latest commit for your repository
function fetchCommits() {
  return new Promise((resolve, reject) => {
    https.get(commitOptions, (res) => {
      let data = '';
      
      res.on('data', chunk => {
        data += chunk;
      });
      
      res.on('end', () => {
        const commits = JSON.parse(data);
        const latestCommitDate = commits.length > 0 ? commits[0].commit.committer.date : null;
        resolve(latestCommitDate);
      });
      
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Save commit data to a file
fetchCommits().then(latestCommitDate => {
  const commitData = {
    name: repoName,
    latest_commit_date: latestCommitDate
  };
  
  // Save commit data to repo-data.json
  fs.writeFileSync('./public/repo-data.json', JSON.stringify([commitData], null, 2));
  console.log('Latest commit data saved to repo-data.json');
}).catch(err => {
  console.error('Error fetching commit data:', err);
});