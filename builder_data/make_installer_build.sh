# read all keys that we send to script
qt_folder="C:/Qt"
architecture=""; # send "x86" as "x86", and "x86_64" for "x64"
pl_path="";
build="";
pl_version="";
branch="";
main_version="";

for arg in "$@"; do
    shift
    case "$arg" in
    '--arch')        set -- "$@" '-a'   ;;
    '--build')       set -- "$@" '-b'   ;;
    '--qtfolder')    set -- "$@" '-f'   ;;
    '--plpath')      set -- "$@" '-p'   ;;
    '--version')     set -- "$@" '-v'   ;;
    '--baseversion') set -- "$@" '-w'   ;;
    '--branch')      set -- "$@" '-c'   ;;  
    '--plmainv')     set -- "$@" '-m'   ;;
    *)               set -- "$@" "$arg" ;;
    esac
done

while getopts "a:f:p:b:v:w:m:" vars
do
    case "${vars}" in
        a) architecture="$OPTARG" ;; # send "x86" as "x86", and "x86_64" for "x64"
        f) qt_folder="$OPTARG" ;;
        p) pl_path="$OPTARG" ;;
        b) builds="$OPTARG" ;; #need send builds name separated by space
        v) pl_version="$OPTARG" ;;
        w) base_version="$OPTARG" ;;
        c) branch="$OPTARG" ;;
        m) main_version="$OPTARG" ;;
    esac
done

if [ $architecture = "x64" ]
then
    architecture="x86_64"
    short_arch="64"
else
    short_arch="32"
fi

qbs_bin=${qt_folder}/Tools/QtCreator/bin/qbs.exe
read -a build_array <<< $builds

# check input values
if [ -z $qt_version ] || [ -z $architecture ]
then
    echo "some of values not found, $@"
    exit 60;
fi

build_keys="project.bashqbs:true project.plsubversion:${pl_version}"
for i in ${!build_array[@]}; do
  build_keys="${build_keys} project.${build_array[$i]}:true"
done

echo "build_keys:${build_keys}"
cd ${pl_path}
cd ..

build_path="${PWD}/build_${subname}/"
bin_path="${PWD}/bin_${subname}/"
echo "bin_path: ${bin_path}"
mkdir ${bin_path}
mkdir ${build_path}

# main part, run compiler all project
cd $pl_path
# TODO add log file output
echo "path to qbs file: ${pl_path}/PL_project_v.2.qbs"

exit 0