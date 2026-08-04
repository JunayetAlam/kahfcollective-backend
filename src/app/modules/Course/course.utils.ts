export const singleCourseGetOrQuery = (userId: string,) => {
    return [
        {
            AND: AndMethodQuery(userId)
        },
        {
            forAll: true,
        }
    ]
}

export const AndMethodQuery = (userId: string) => {
    return [
        {
            unenrollCourses: {
                none: {
                    userId
                }
            },
        },
        {
            groupCourses: {
                some: {
                    group: {
                        isDeleted: false,
                        userGroups: {
                            some: {
                                userId
                            }
                        }
                    }
                }
            },
        }
    ]
}