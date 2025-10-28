Push-Location 'D:\Study\Vue-\个人门户\project-nexus'
try {
    git add .
    git commit -m "Update code changes: modify timer, log, and dialog components; add new tag input and category selector components"
    git push
    Write-Host "Repository pushed successfully!"
}
finally {
    Pop-Location
}





