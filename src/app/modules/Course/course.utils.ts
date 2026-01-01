export const singleCourseGetOrQuery = (userId: string) => {
    return [
        {
            groupCourses: {
                some: {
                    group: {
                        userGroups: {
                            some: {
                                userId,
                            }
                        },
                        isDeleted: false,
                    },
                }
            }
        },
        {
            forAll: true,
        }
    ]
}