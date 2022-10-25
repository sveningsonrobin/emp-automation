import {
    assertGitBranchUpToDate,
    assertIsOnGitBranch,
    assertNoGitChanges,
    commitVersion,
    createAndPushGitTag,
    fetchGitTags,
    getCwdPath,
    getNewVersionInfo,
    getOrCreateChangelog,
    getReleasePackageJsonContent,
    pushGitBranch,
    releasePackage,
    saveChangelog,
    updatePackageJsonVersion,
    VersionType,
} from '../actions';

import { ICommit, IEnvironment, ILogger, IRegistry } from '../types';
import { askForOption, askForOptionalString } from '../utils';

const getSelectedRegistry = async (
    registries: IRegistry[]
): Promise<IRegistry> => {
    //TODO, not implemented yet.

    return null;
};

const getInput = async (
    logger: ILogger,
    packageJsonContent: Record<string, any>
) => {
    const { version } = packageJsonContent;
    logger.log(`Current version: ${version}`);

    const types = Object.values(VersionType);
    const initialIndex = types.indexOf(VersionType.PATCH);

    const type = await askForOption(
        'What is the type of your release?',
        types,
        initialIndex
    );

    const isMajor = type === VersionType.MAJOR;
    let breakingChangesDescription = '';

    if (isMajor) {
        breakingChangesDescription = await askForOptionalString(
            'Please enter a breaking changes description:'
        );
    }

    return {
        type,
        breakingChangesDescription,
    };
};

const updateChangelog = (
    packageJsonContent: Record<string, any>,
    newVersionString: string,
    breakingChangesDescription: string,
    commits: ICommit[]
) => {
    const changelog = getOrCreateChangelog(packageJsonContent.name);
    changelog.versions.push({
        version: newVersionString,
        breakingChanges: breakingChangesDescription,
        commits,
    });

    saveChangelog(changelog);
};

export const runRelease = async (
    logger: ILogger,
    environment: IEnvironment
) => {
    const packageJsonFullPath = getCwdPath('package.json');
    const packageJsonContent = await getReleasePackageJsonContent(
        logger,
        packageJsonFullPath
    );

    await assertNoGitChanges(logger);
    await assertIsOnGitBranch(logger, 'master');
    await assertGitBranchUpToDate(logger);

    const registries = environment.getRegistries();
    const hasMultipleRegistries = registries.length > 1;

    const registry = hasMultipleRegistries
        ? await getSelectedRegistry(registries)
        : registries[0];

    await fetchGitTags(logger);

    const { version } = packageJsonContent;
    const { type, breakingChangesDescription } = await getInput(
        logger,
        packageJsonContent
    );

    const info = await getNewVersionInfo(logger, version, <VersionType>type);

    if (!info) {
        return;
    }

    const { newVersionString, newTag, commits } = info;

    updatePackageJsonVersion(
        packageJsonFullPath,
        packageJsonContent,
        newVersionString
    );

    updateChangelog(
        packageJsonContent,
        newVersionString,
        breakingChangesDescription,
        commits
    );

    await commitVersion(logger, newVersionString);
    await pushGitBranch(logger, 'master');
    await createAndPushGitTag(logger, newTag);
    await releasePackage(
        logger,
        registry,
        packageJsonContent,
        breakingChangesDescription
    );

    logger.log(
        `🚀 Released version "${newVersionString}" of package "${packageJsonContent.name}".`
    );
};
