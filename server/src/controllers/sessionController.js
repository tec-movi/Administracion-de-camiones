import { usersService } from "../services/index.js";
import { createHash, passwordValidation } from '../utils/index.js'
import UserDTO from "../dto/user.dto.js";
import jwt from 'jsonwebtoken'

const register = async(req, res) => {
  try {
    const { full_name, email, password } = req.body // se toman los datos desde el formulario
    if(!full_name || !email || !password) return res.status(400).send({ status: "error", error: "Campos incompletos" })
    const exists = await usersService.getUserByEmail(email) // se rectifica si existe el correo descrito
    if(exists) return res.status(400).send({ status: "error", error: "El email indicado ya se encuentra registrado" })
    const hashedPassword = await createHash(password) // se codifica el password antes de enviarlo a la BD
    // se construye el usuario con el password encriptado
    const user = {
      full_name,
      email,
      password: hashedPassword
    }
    let result = await usersService.create(user)
    res.send({ status: "success", payload: { createdId: result.insertId } })
  } catch (error) {
    res.status(500).send({ status: "error", error: error.message })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body // se toman los datos desde el formulario
    if(!email || !password) {
      return res.status(400).send({ status: "error", error: "Campos incompletos." }) // si no se ingresa alguno de los campos se solicita completarlos.
    }
  
    const user = await usersService.getUserWithRoleByUserEmail(email) // se realiza busqueda de usuario con el email indicado

    // En caso de que no se encuentre el usuario o que la combinación de usuario y contraseña sea incorrecta se envía un mensaje que solicite rectificar.
    // Por motivos de seguridad NO se entrega información que pueda ser sensible a posibles ataques externos. Si un externo encuentra un email que si está en la base de datos recibirá el mensaje de que la contraseña es incorrecta, lo cual le confirmará que logró decifrar un email correcto. Es por esto que se entrega un mensaje genérico independiente del correo o contraseña.

    if (!user) return res.status(404).send({ status: "error", error: "No se ha encontrado la combinación de usuario y contraseña indicados." })
  
    // se verifica si el password coincide con el correcto y en caso contrario se informa que alguno de los campos no es correcto para no entregar información sensible.
    const isValid = await passwordValidation(user, password)
    if (!isValid) return res.status(400).send({ status: "error", error: "No se ha encontrado la combinación de usuario y contraseña indicados." })
    
    // Luego de estas validaciones, se retira de la información del usuario los campos sensibles (password) y se entregan al lado del cliente el resto de los datos para su renderizado
    const userDTO = UserDTO.getUserTokenFrom(user)
    const token = jwt.sign(userDTO, process.env.JWT_SECRET, { expiresIn: '1h' }) // se crea un token usando el usuario indicado, una palabra secreta y el tiempo de validez del token.

    // se genera una cookie de sesión encriptada y única y se guarda en el lado del cliente y se configura que esta cookie solo sea accesible a través de una solicitud http.
    res.cookie('access_token', token, { httpOnly: true, sameSite: 'none', secure: 'false' }).send({ status: "success", message: "Logged in", payload: userDTO })
  } catch (error) {
    res.status(500).send({ message: 'Error interno del servidor', error: error.message })
  }
}

/**
 * Este método se encarga de verificar si esxiste actualmente una cookie de login para redirecionar la pagina /login a la página /perfil
 * @returns 
 */
const current = async (req, res) => {
  try {
    const cookie = req.cookies['access_token']
    if(!cookie) {
      return res.status(401).send({ status: "error", error: "No autenticado" })
    }
    const user = jwt.verify(cookie, process.env.JWT_SECRET)
    if(user)
      return res.send({ status: "success", payload: user })
  } catch (error) {
    res.status(401).send({ status: "error", error: "Token inválido" })
  }
}

const logout = async (req, res) => {
  res.clearCookie('access_token', {
    httpOnly: "true"
  }).send({ status: "success", message: "Logged out successfully" })
}

export default {
  login,
  register,
  current,
  logout
}
