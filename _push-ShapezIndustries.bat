robocopy "../shapez.io/src/" "./" "index.html"

robocopy "../shapez.io/build/" "./shapez/ShapezIndustries" /S

git add -A

git commit -m "_push-ShapezIndustries"

git push