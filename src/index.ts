/**
 * Created by rockyl on 2020-07-17.
 */

import ts = require('typescript')
import {v4 as generateUUID} from 'uuid'

export function parse(sceneSource) {
	let sourceFile = ts.createSourceFile('test.js', sceneSource, ts.ScriptTarget.ES2015)

	function findDoc(sourceFile) {
		for (let statement of sourceFile.statements) {
			if (statement.kind === ts.SyntaxKind.ExpressionStatement) {
				const {operatorToken, left, right} = statement.expression
				if (operatorToken.kind === ts.SyntaxKind.EqualsToken && left.expression.text === 'exports' && left.name.text === 'doc') {
					return right
				}
			}
		}
	}

	function getSourceFromSourceFile(sourceFile) {
		return function (node) {
			const {pos, end} = node
			return sourceFile.text.substring(pos, end).trim()
		}
	}

	let getSource = getSourceFromSourceFile(sourceFile)

	function evalScript(script) {
		let func = new Function('return ' + script)
		return func()
	}

	function evalSource(node) {
		let docOptionsStr = getSource(node)
		return evalScript(docOptionsStr)
	}

	function parseExpression(node) {
		let result:any = {}

		if (node.expression.kind === ts.SyntaxKind.PropertyAccessExpression) {
			let prev = node.expression.expression
			if (prev.kind === ts.SyntaxKind.Identifier) {
				let nodeNs = prev.text
				let nodeName = node.expression.name.text
				result.type = nodeNs + '.' + nodeName
			} else {
				let r = parseNode(prev)
				if (r) {
					result = {...result, ...r}
				}
			}
		} else {

		}

		return result
	}

	function parseArguments(node) {
		let argument = node.arguments ? node.arguments[0] : node
		if (argument.kind === ts.SyntaxKind.ObjectLiteralExpression) {
			let props = {}
			for (let property of argument.properties) {
				if (property.initializer.kind === ts.SyntaxKind.CallExpression) {
					props[property.name.text] = 'script://' + getSource(property.initializer)
				} else {
					props[property.name.text] = evalSource(property.initializer)
				}
			}
			return props
		} else if (argument.kind === ts.SyntaxKind.ArrayLiteralExpression) {
			let cmd = node.expression.name.text
			let name
			switch (cmd) {
				case 'c':
					name = 'children'
					break
				case 's':
					name = 'scripts'
					break
			}

			if (name) {
				let collection = []
				for (let item of argument.elements) {
					let r = cmd === 's' ? parseArguments(item) : parseNode(item)
					collection.push(r)
				}
				return {
					[name]: collection,
				}
			}
		}
	}

	function parseNode(node) {
		let props:any = {}
		if (node.arguments) {
			let r:any = parseArguments(node)
			if (r) {
				if (props.children && r.children) {
					props.children.push(...r.children)
				} else if (props.scripts && r.scripts) {
					props.scripts.push(...r.scripts)
				} else {
					props = {...props, ...r}
				}
			}
		}
		if (node.expression) {
			let r = parseExpression(node)
			if (r) {
				props = {...props, ...r}
			}
		}

		if (!props.hasOwnProperty('uuid')) {
			props.uuid = generateUUID()
		}
		return props
	}

	const docAst:any = findDoc(sourceFile)

	let options = evalSource(docAst.expression.expression.arguments[0])

	let [factory, assets] = docAst.arguments[0].properties

	factory = factory.initializer.body

	for (let statement of factory.statements) {
		if (statement.kind === ts.SyntaxKind.ReturnStatement) {
			factory = statement.expression
		}
	}

	let view = parseNode(factory)
	assets = evalSource(assets.initializer)

	return {
		options,
		view,
		assets,
	}
}
