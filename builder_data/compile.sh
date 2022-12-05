# read all keys that we send to script
qt_folder="C:/Qt"
architecture=""; # send "x86" as "x86", and "x86_64" for "x64"
qt_version="";
compiler="";
pl_path="";
builds="";
qt_settings_path=C:/Users/barys/Documents/dev/develop/react/BuildServerApp/qt_settings;
config_key="";
profile_key="";
pl_version="";

for arg in "$@"; do
    shift
    case "$arg" in
    '--arch')        set -- "$@" '-a'   ;;
    '--qt')          set -- "$@" '-q'   ;;
    '--builds')      set -- "$@" '-b'   ;;
    '--compiler')    set -- "$@" '-c'   ;;
    '--qtfolder')    set -- "$@" '-f'   ;;
    '--plpath')      set -- "$@" '-p'   ;;
    '--qt_settings') set -- "$@" '-s'   ;;
    '--profile')     set -- "$@" '-t'   ;;
    '--config')      set -- "$@" '-u'   ;;
    '--version')     set -- "$@" '-v'   ;;
    *)               set -- "$@" "$arg" ;;
    esac
done

while getopts "a:q:c:f:p:b:s:t:u:v:" vars
do
    case "${vars}" in
        a) architecture="$OPTARG" ;; # send "x86" as "x86", and "x86_64" for "x64"
        q) qt_version="$OPTARG" ;;
        c) compiler="$OPTARG" ;;
        f) qt_folder="$OPTARG" ;;
        p) pl_path="$OPTARG" ;;
        b) builds="$OPTARG" ;; #need send builds name separated by space
        s) qt_settings_path="$OPTARG" ;;
        t) profile_key="$OPTARG" ;;
        u) config_key="$OPTARG" ;;
        v) pl_version="$OPTARG" ;;
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
compiler="mingw_${compiler}"
qt_version="${qt_version//[-._]/}"
subname="${qt_version}_${short_arch}"
read -a build_array <<< $builds

# check input values
if [ -z $qt_version ] || [ -z $architecture ]
then
    echo "some of values not found, $@"
    exit 60;
fi

build_keys="project.bashqbs:true project.subversion:${pl_version}"
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

${qbs_bin} resolve \
-d ${build_path} \
-f ${pl_path}/PL_project_v.2.qbs \
--settings-dir ${qt_settings_path} \
config:Release_Desktop__${config_key} \
qbs.defaultBuildVariant:release \
qbs.installRoot:${bin_path} \
profile:qtc_Desktop__${profile_key} ${build_keys} || exit 80
echo 'resolve done'

alias build_command=${qbs_bin} build \
-d ${build_path} \
-f ${pl_path}/PL_project_v.2.qbs \
--settings-dir ${qt_settings_path} \
--jobs 4 \
--clean-install-root \
config:Release_Desktop__${config_key} \
qbs.defaultBuildVariant:release \
qbs.installRoot:${bin_path} \
profile:qtc_Desktop__${profile_key} ${build_keys}

echo "${qbs_bin} build -d ${build_path} -f ${pl_path}/PL_project_v.2.qbs \
--settings-dir ${qt_settings_path} \
--jobs 4 \
--log-level warning \
--clean-install-root \
config:Release_Desktop__${config_key} \
qbs.defaultBuildVariant:release \
qbs.installRoot:${bin_path} \
profile:qtc_Desktop__${profile_key} ${build_keys}"

build_command
echo 'build done'

exit 0