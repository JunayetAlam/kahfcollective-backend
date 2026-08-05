export const singleCourseGetOrQuery = (userId: string) => {
  return [
    {
      AND: AndMethodQuery(userId),
    },
    {
      forAll: true,
    },
  ];
};

/** Opt-in: enrolled row + membership in a class assigned to the course */
export const AndMethodQuery = (userId: string) => {
  return [
    {
      enrollCourses: {
        some: {
          userId,
        },
      },
    },
    {
      groupCourses: {
        some: {
          group: {
            isDeleted: false,
            userGroups: {
              some: {
                userId,
              },
            },
          },
        },
      },
    },
  ];
};
