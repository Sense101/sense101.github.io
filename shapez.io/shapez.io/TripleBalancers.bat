robocopy "../shapez.io/src/" "./" "index.html"

robocopy "../shapez.io/build/" "./shapez/TripleBalancers" /S

git add -A

git commit -m "_push-TripleBalancers"

git push