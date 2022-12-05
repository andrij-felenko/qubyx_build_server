# read all keys that we send to script
qt_folder="C:/Qt"
branch=""; pl_path="";

# Transform long options to short ones
for arg in "$@"; do
  shift
  case "$arg" in
    '--branch')   set -- "$@" '-b'   ;;
    '--plpath')   set -- "$@" '-p'   ;;
    *)            set -- "$@" "$arg" ;;
  esac
done

while getopts "a:q:b:c:f:p:" vars
do
    case "${vars}" in
        b) branch="$OPTARG" ;;
        p) pl_path="$OPTARG" ;;
    esac
done

echo "Branch: $branch";

# checkout to needed branch and update it
cd ..
rm "${pl_path}/.git/index.lock"
git --git-dir "${pl_path}/.git" reset --hard
git --git-dir "${pl_path}/.git" checkout $branch || exit 71;
git --git-dir "${pl_path}/.git" pull origin $branch || exit 72;

exit 0