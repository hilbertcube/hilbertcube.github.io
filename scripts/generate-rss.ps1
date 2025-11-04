param(
    [string]$InputPath = "assets\json\articles.json",
    [string]$OutputPath = "rss\feed.xml",
    [string]$BaseUrl = "https://neumanncondition.com"
)

# Function to convert date string to RFC 2822 format for RSS
function Convert-ToRFC2822Date {
    param([string]$DateString)
    
    if ([string]::IsNullOrEmpty($DateString) -or $DateString -eq "") {
        return ""
    }
    
    try {
        # Try to parse various date formats
        $date = $null
        
        # Try "Month Day, Year" format first
        if ($DateString -match "^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$") {
            $date = [DateTime]::ParseExact($DateString, "MMMM d, yyyy", $null)
        }
        # Try "Month, Year" format
        elseif ($DateString -match "^([A-Za-z]+),?\s+(\d{4})$") {
            $date = [DateTime]::ParseExact($DateString.Replace(",", ""), "MMMM yyyy", $null)
        }
        
        if ($date) {
            return $date.ToString("ddd, dd MMM yyyy HH:mm:ss zzz")
        }
    }
    catch {
        Write-Warning "Could not parse date: $DateString"
    }
    
    return ""
}

# Function to escape XML content
function Escape-XmlContent {
    param([string]$Content)
    
    if ([string]::IsNullOrEmpty($Content)) {
        return ""
    }
    
    return $Content -replace '&', '&amp;' -replace '<', '&lt;' -replace '>', '&gt;' -replace '"', '&quot;' -replace "'", '&apos;'
}

# Main script execution
Write-Host "Generating RSS feed from articles.json..." -ForegroundColor Yellow

try {
    # Read the articles.json file
    $articlesContent = Get-Content -Path $InputPath -Raw -Encoding UTF8
    $articlesData = $articlesContent | ConvertFrom-Json
    
    Write-Host "Successfully loaded articles.json" -ForegroundColor Green
    Write-Host "Found:" -ForegroundColor White
    Write-Host "   - $($articlesData.articles.Count) articles" -ForegroundColor Gray
    Write-Host "   - $($articlesData.posts.Count) posts" -ForegroundColor Gray
    Write-Host "   - $($articlesData.others.Count) other items" -ForegroundColor Gray
    
    # Generate RSS 2.0 feed
    $currentDate = Get-Date
    $pubDate = $currentDate.ToString("ddd, dd MMM yyyy HH:mm:ss zzz")
    
    $rssContent = @"
<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>neumanncondition</title>
    <link>$BaseUrl/</link>
    <description>Recent articles and posts from neumanncondition.com</description>
    <language>en-us</language>
    <pubDate>$pubDate</pubDate>
    <lastBuildDate>$pubDate</lastBuildDate>
    <generator>PowerShell RSS Generator</generator>
"@

    # Add articles as RSS items (only those with dates)
    foreach ($article in $articlesData.articles | Where-Object { $_.date -and $_.date -ne "" }) {
        $escapedTitle = Escape-XmlContent $article.title
        $escapedDescription = Escape-XmlContent $article.description
        if ($article.link.StartsWith("http")) { 
            $articleLink = $article.link 
        } else { 
            $articleLink = "$BaseUrl$($article.link)" 
        }
        $itemDate = Convert-ToRFC2822Date $article.date
        $categories = ($article.topics | ForEach-Object { "<category>$(Escape-XmlContent $_)</category>" }) -join "`n      "
        
        $rssContent += @"

    <item>
      <title>$escapedTitle</title>
      <link>$articleLink</link>
      <description>$escapedDescription</description>
      <guid>$articleLink</guid>
      $categories
      <pubDate>$itemDate</pubDate>
    </item>
"@
    }
    
    # Add posts as RSS items (only those with dates)
    foreach ($post in $articlesData.posts | Where-Object { $_.date -and $_.date -ne "" }) {
        $escapedTitle = Escape-XmlContent $post.title
        $escapedDescription = Escape-XmlContent $post.description
        if ($post.link.StartsWith("http")) { 
            $postLink = $post.link 
        } else { 
            $postLink = "$BaseUrl$($post.link)" 
        }
        $itemDate = Convert-ToRFC2822Date $post.date
        $categories = ($post.topics | ForEach-Object { "<category>$(Escape-XmlContent $_)</category>" }) -join "`n      "
        
        $rssContent += @"

    <item>
      <title>$escapedTitle</title>
      <link>$postLink</link>
      <description>$escapedDescription</description>
      <guid>$postLink</guid>
      $categories
      <pubDate>$itemDate</pubDate>
    </item>
"@
    }
    
    $rssContent += @"

  </channel>
</rss>
"@

    # Write the RSS content to file
    $rssContent | Out-File -FilePath $OutputPath -Encoding UTF8
    
    Write-Host "RSS feed generated successfully!" -ForegroundColor Green
    Write-Host "Output saved to: $OutputPath" -ForegroundColor White
    Write-Host "Feed URL: $BaseUrl/rss/feed.xml" -ForegroundColor White
    
}
catch {
    Write-Host "Error generating RSS feed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host "RSS generation completed!" -ForegroundColor Green