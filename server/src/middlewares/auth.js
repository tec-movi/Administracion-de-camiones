export const authorize = (allowedRoles = []) => {
  return (req, res, next) => {
    const user = req.session?.user

    if(!user) {
      return res.status(401).send({ status: "error", error: "No autenticado" })
    }

    if(!allowedRoles.includes(user.role)) {
      return res.status(403).send({ status: "error", error: "No autorizado" })
    }

    next()
  }
}