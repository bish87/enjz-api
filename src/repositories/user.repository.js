import { prisma } from "../config/prisma.js"

export function findUserByPhone(phone) {
    return prisma.user.findUnique({
        where: {
            phone
        }
    })
}


export function createUser(data){
 return prisma.user.create({
    data
 })
}


export function findUserById(id) {
  return prisma.user.findUnique({
    where: {
      id
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      city: true,
      role: true,
      createdAt: true
    }
  });
}

export function updateUserProfile (id, data) {
  return prisma.user.update({
    where: {
      id
    },
    data,
    select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        city: true,
        role: true,
        createdAt: true
    }
  })
}