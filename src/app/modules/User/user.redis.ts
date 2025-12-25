import { Group, User } from '@prisma/client';
import { getMany, set } from '../../redis/GetOrSet';
import { prisma } from '../../utils/prisma';

export const UsersRedis = async (
  users: (User & { userGroups: { group: Group }[] })[],
) => {
  const newUser = await Promise.all(
    users.map(async user => {
      const userGroupsId = user.userGroups.map(item => item.group.id);
      if (userGroupsId.length < 1) {
        return user;
      } else {
        const keys = userGroupsId.map(id => `group-${id}-details`);
        const groups = await getMany(keys);
        const groupDatas = groups
          .filter(item => !!item.data)
          .map(item => item.data);
        const missingGroups = groups
          .filter(group => !group.data)
          .map(item => item.key.split('-')[1]);
        let missingGroupData: any[] = [];
        if (missingGroups.length > 0) {
          missingGroupData = await prisma.group.findMany({
            where: {
              id: {
                in: missingGroups,
              },
              isDeleted: false,
            },
            select: {
              id: true,
              name: true,
            },
          });
          missingGroupData.forEach(async item => {
            await set({
              key: `group-${item.id}-details`,
              ttl: 24 * 60 * 60,
              data: item,
            });
          });
        }

        const returnedGroups = [...groupDatas, ...missingGroupData];
        user.userGroups = returnedGroups.map(item => ({ group: item }));
      }
      return user;
    }),
  );
  return newUser;
};
